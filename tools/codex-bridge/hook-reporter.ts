import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const hookName = process.argv[2] ?? 'PostToolUse';
const mapping: Record<string, string> = {
  SessionStart: 'run_started', PostToolUse: 'task_started', Stop: 'run_paused', SessionEnd: 'run_paused',
};
const apiBase = process.env.GUANJIE_API_BASE?.replace(/\/$/, '');
const token = process.env.GUANJIE_BRIDGE_TOKEN;
if (!apiBase || !token) process.exit(0);

try {
  const configPath = resolve(process.cwd(), '.guanjie/project.json');
  const project = JSON.parse(await readFile(configPath, 'utf8')) as { projectCode: string };
  await fetch(`${apiBase}/api/research-admin/bridge/events`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      eventId: `hook-${randomUUID()}`, projectCode: project.projectCode,
      threadId: process.env.CODEX_THREAD_ID ?? 'hook-session', eventType: mapping[hookName] ?? 'task_started',
      summary: `Codex Hook: ${hookName}`, deliverables: [], blocker: null, nextAction: null,
      occurredAt: new Date().toISOString(),
    }),
  });
} catch {
  // Hooks must never interrupt the Codex session; the Bridge poller will retry later.
}
