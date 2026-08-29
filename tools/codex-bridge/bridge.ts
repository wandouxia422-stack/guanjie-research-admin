import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import { relative, resolve } from 'node:path';
import { Codex } from '@openai/codex-sdk';

interface Job {
  id: string; projectCode: string; threadId: string | null; repoLocalPath: string | null;
  payload: Record<string, unknown>;
}

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const config = {
  apiBase: required('GUANJIE_API_BASE').replace(/\/$/, ''),
  token: required('GUANJIE_BRIDGE_TOKEN'),
  bridgeId: required('GUANJIE_BRIDGE_ID'),
  projectRoot: resolve(required('GUANJIE_PROJECT_ROOT')),
  pollMs: Number(process.env.GUANJIE_POLL_INTERVAL_MS ?? 5000),
};

const request = async <T>(path: string, body: Record<string, unknown>): Promise<T> => {
  const response = await fetch(`${config.apiBase}/api/research-admin/bridge${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${config.token}` },
    body: JSON.stringify(body), signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`${path} failed: ${response.status} ${await response.text()}`);
  return response.json() as Promise<T>;
};

const projectPath = (value: string | null): string => {
  if (!value) throw new Error('Project has no repo_local_path');
  const target = resolve(value);
  const relation = relative(config.projectRoot, target);
  if (relation.startsWith('..') || relation.includes('/../')) throw new Error('Project path is outside GUANJIE_PROJECT_ROOT');
  return target;
};

const report = async (
  job: Job,
  eventType: string,
  summary: string,
  threadId: string,
  extra: { taskCode?: string; deliverables?: string[]; blocker?: string | null; nextAction?: string | null } = {},
): Promise<void> => request('/events', {
  eventId: `bridge-${randomUUID()}`, projectCode: job.projectCode, threadId,
  taskCode: extra.taskCode, eventType, summary, deliverables: extra.deliverables ?? [],
  blocker: extra.blocker ?? null, nextAction: extra.nextAction ?? null, occurredAt: new Date().toISOString(),
});

const outputSchema = {
  type: 'object', additionalProperties: false,
  required: ['eventType', 'summary', 'deliverables', 'blocker', 'nextAction'],
  properties: {
    taskCode: { type: ['string', 'null'] },
    eventType: { enum: ['task_completed', 'waiting_approval', 'blocked', 'run_paused', 'run_failed', 'run_completed'] },
    summary: { type: 'string' }, deliverables: { type: 'array', items: { type: 'string' } },
    blocker: { type: ['string', 'null'] }, nextAction: { type: ['string', 'null'] },
  },
};

const execute = async (job: Job): Promise<void> => {
  const workingDirectory = projectPath(job.repoLocalPath);
  await request(`/jobs/${job.id}/running`, { bridgeId: config.bridgeId });
  const codex = new Codex();
  const options = { workingDirectory, sandboxMode: 'workspace-write' as const, approvalPolicy: 'on-request' as const };
  const thread = job.threadId ? codex.resumeThread(job.threadId, options) : codex.startThread(options);
  const abortController = new AbortController();
  activeAbortController = abortController;
  try {
    await report(job, 'run_started', '已从观界项目驾驶舱继续执行。', job.threadId ?? 'pending');
    const result = await thread.run(
      '继续当前项目中已明确、不需额外人工选择的下一项工作。不得越过人工确认节点，不得伪造进度。最终返回结构化状态。',
      { outputSchema, signal: abortController.signal },
    );
    const threadId = thread.id ?? job.threadId ?? 'unknown';
    const parsed = JSON.parse(result.finalResponse) as {
      taskCode?: string | null; eventType: string; summary: string; deliverables: string[];
      blocker: string | null; nextAction: string | null;
    };
    await report(job, parsed.eventType, parsed.summary, threadId, {
      taskCode: parsed.taskCode ?? undefined, deliverables: parsed.deliverables,
      blocker: parsed.blocker, nextAction: parsed.nextAction,
    });
    await request(`/jobs/${job.id}/complete`, { bridgeId: config.bridgeId, status: 'completed', threadId, summary: parsed.summary });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const threadId = thread.id ?? job.threadId ?? 'unknown';
    await report(job, stopping ? 'run_paused' : 'run_failed', stopping ? 'Bridge 退出，本次执行已暂停。' : message, threadId).catch(() => undefined);
    await request(`/jobs/${job.id}/complete`, { bridgeId: config.bridgeId, status: 'failed', threadId, errorMessage: message });
  } finally {
    activeAbortController = null;
  }
};

let stopping = false;
let activeAbortController: AbortController | null = null;
process.on('SIGINT', () => { stopping = true; activeAbortController?.abort(); });
process.on('SIGTERM', () => { stopping = true; activeAbortController?.abort(); });

const sleep = (milliseconds: number): Promise<void> => new Promise((done) => setTimeout(done, milliseconds));

const main = async (): Promise<void> => {
  process.stdout.write(`[guanjie-bridge] ${config.bridgeId} started\n`);
  while (!stopping) {
    try {
      await request('/heartbeat', { bridgeId: config.bridgeId, projectRoot: config.projectRoot });
      const job = await request<Job | null>('/jobs/claim', { bridgeId: config.bridgeId });
      if (job) await execute(job);
    } catch (error: unknown) {
      process.stderr.write(`[guanjie-bridge] offline/retry: ${error instanceof Error ? error.message : String(error)}\n`);
    }
    if (!stopping) await sleep(config.pollMs);
  }
  process.stdout.write('[guanjie-bridge] stopped; unclaimed jobs remain pending\n');
};

void main();
