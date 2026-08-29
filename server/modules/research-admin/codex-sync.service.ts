import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { and, asc, eq } from 'drizzle-orm';

import { codexBridge, codexEvent, codexJob, projectTask, researchProject } from '@server/database/schema';
import type {
  BridgeHeartbeatRequest, CodexEventRequest, CodexJobItem, CompleteCodexJobRequest,
  ProjectTaskStatus,
} from '@shared/api.interface';
import { calculateProgressPercent } from './project-progress';

const eventCodexStatus: Record<CodexEventRequest['eventType'], string> = {
  run_started: 'running', task_started: 'running', task_completed: 'running',
  waiting_approval: 'waiting_approval', blocked: 'blocked', run_paused: 'paused',
  run_failed: 'failed', run_completed: 'completed',
};

@Injectable()
export class CodexSyncService {
  private readonly logger = new Logger(CodexSyncService.name);
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async receiveEvent(input: CodexEventRequest): Promise<{ accepted: boolean; duplicate: boolean }> {
    const projects = await this.db.select().from(researchProject)
      .where(eq(researchProject.projectCode, input.projectCode));
    if (projects.length === 0) throw new NotFoundException('项目代码不存在');
    const project = projects[0];
    const inserted = await this.db.transaction(async (tx) => {
      const accepted = await tx.insert(codexEvent).values({
        eventId: input.eventId, projectId: project.id, projectCode: input.projectCode,
        threadId: input.threadId || null, taskCode: input.taskCode || null,
        eventType: input.eventType, summary: input.summary,
        payload: { deliverables: input.deliverables, blocker: input.blocker, nextAction: input.nextAction },
        occurredAt: new Date(input.occurredAt),
      }).onConflictDoNothing({ target: codexEvent.eventId }).returning({ id: codexEvent.id });
      if (accepted.length === 0) return false;
      let task: typeof projectTask.$inferSelect | undefined;
      if (input.taskCode) {
        const tasks = await tx.select().from(projectTask).where(and(
          eq(projectTask.projectId, project.id), eq(projectTask.taskCode, input.taskCode),
        ));
        task = tasks[0];
      }
      let nextStatus: ProjectTaskStatus | undefined;
      if (task && input.eventType === 'task_started') nextStatus = 'running';
      if (task && input.eventType === 'waiting_approval') nextStatus = 'waiting_approval';
      if (task && input.eventType === 'blocked') nextStatus = 'blocked';
      if (task && input.eventType === 'task_completed') {
        nextStatus = task.requiresApproval ? 'waiting_approval' : 'done';
      }
      if (task && nextStatus) {
        await tx.update(projectTask).set({
          status: nextStatus, deliverables: input.deliverables,
          completionSummary: input.summary, blocker: input.blocker,
          startedAt: nextStatus === 'running' && !task.startedAt ? new Date(input.occurredAt) : task.startedAt,
          completedAt: nextStatus === 'done' ? new Date(input.occurredAt) : null,
          updatedAt: new Date(),
        }).where(eq(projectTask.id, task.id));
      }
      const tasks = await tx.select({ weight: projectTask.weight, status: projectTask.status })
        .from(projectTask).where(eq(projectTask.projectId, project.id));
      const progressPercent = calculateProgressPercent(
        tasks.map((item) => ({ weight: item.weight, status: item.status as ProjectTaskStatus })),
      );
      await tx.update(researchProject).set({
        progressPercent,
        codexStatus: nextStatus === 'waiting_approval' ? 'waiting_approval' : eventCodexStatus[input.eventType],
        currentStage: task?.stageName ?? project.currentStage,
        currentTask: task?.title ?? project.currentTask,
        nextAction: input.nextAction, blocker: input.blocker,
        codexThreadId: input.threadId || project.codexThreadId,
        lastSyncedAt: new Date(input.occurredAt), updatedAt: new Date(),
      }).where(eq(researchProject.id, project.id));
      return true;
    });
    if (!inserted) return { accepted: true, duplicate: true };
    this.logger.log(`Accepted Codex event ${input.eventId}`);
    return { accepted: true, duplicate: false };
  }

  async createContinueJob(projectId: string): Promise<CodexJobItem> {
    const projects = await this.db.select().from(researchProject).where(eq(researchProject.id, projectId));
    if (projects.length === 0) throw new NotFoundException('项目不存在');
    const [job] = await this.db.insert(codexJob).values({
      projectId, action: 'continue_project', status: 'pending',
      payload: { requestedAt: new Date().toISOString() },
    }).returning();
    return this.mapJob(job, projects[0]);
  }

  async claimJob(bridgeId: string): Promise<CodexJobItem | null> {
    const candidates = await this.db.select().from(codexJob)
      .where(eq(codexJob.status, 'pending')).orderBy(asc(codexJob.createdAt)).limit(1);
    if (candidates.length === 0) return null;
    const claimed = await this.db.update(codexJob).set({
      status: 'claimed', bridgeId, claimedAt: new Date(), updatedAt: new Date(),
    }).where(and(eq(codexJob.id, candidates[0].id), eq(codexJob.status, 'pending'))).returning();
    if (claimed.length === 0) return null;
    const [project] = await this.db.select().from(researchProject)
      .where(eq(researchProject.id, claimed[0].projectId));
    return this.mapJob(claimed[0], project);
  }

  async markJobRunning(jobId: string, bridgeId: string): Promise<void> {
    const rows = await this.db.update(codexJob).set({ status: 'running', updatedAt: new Date() })
      .where(and(eq(codexJob.id, jobId), eq(codexJob.bridgeId, bridgeId), eq(codexJob.status, 'claimed'))).returning();
    if (rows.length === 0) throw new NotFoundException('作业不存在或已被处理');
  }

  async completeJob(jobId: string, bridgeId: string, input: CompleteCodexJobRequest): Promise<void> {
    const rows = await this.db.update(codexJob).set({
      status: input.status, completedAt: new Date(), errorMessage: input.errorMessage || null, updatedAt: new Date(),
    }).where(and(eq(codexJob.id, jobId), eq(codexJob.bridgeId, bridgeId), eq(codexJob.status, 'running'))).returning();
    if (rows.length === 0) throw new NotFoundException('作业不存在或状态不允许完成');
    if (input.threadId) {
      await this.db.update(researchProject).set({ codexThreadId: input.threadId, updatedAt: new Date() })
        .where(eq(researchProject.id, rows[0].projectId));
    }
  }

  async heartbeat(input: BridgeHeartbeatRequest): Promise<{ online: true; serverTime: string }> {
    const existing = await this.db.select().from(codexBridge).where(eq(codexBridge.bridgeId, input.bridgeId));
    if (existing.length > 0) {
      await this.db.update(codexBridge).set({ status: 'online', projectRoot: input.projectRoot || null, lastHeartbeatAt: new Date(), updatedAt: new Date() })
        .where(eq(codexBridge.bridgeId, input.bridgeId));
    } else {
      await this.db.insert(codexBridge).values({ bridgeId: input.bridgeId, status: 'online', projectRoot: input.projectRoot || null });
    }
    return { online: true, serverTime: new Date().toISOString() };
  }

  private mapJob(job: typeof codexJob.$inferSelect, project: typeof researchProject.$inferSelect): CodexJobItem {
    return {
      id: job.id, projectId: job.projectId, projectCode: project.projectCode, action: job.action,
      status: job.status as CodexJobItem['status'], payload: job.payload as Record<string, unknown>, bridgeId: job.bridgeId,
      threadId: project.codexThreadId, repoLocalPath: project.repoLocalPath,
      createdAt: job.createdAt.toISOString(),
    };
  }
}
