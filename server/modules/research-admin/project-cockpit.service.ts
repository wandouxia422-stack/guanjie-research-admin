import { randomUUID } from 'node:crypto';

import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { and, asc, desc, eq } from 'drizzle-orm';

import { codexBridge, codexEvent, projectTask, researchProject } from '@server/database/schema';
import type {
  CodexEventItem, ProjectCockpitDetail, ProjectTaskItem, ProjectTaskStatus,
  ResearchProjectItem, UpdateProjectTaskRequest,
} from '@shared/api.interface';
import { calculateProgressPercent, isBridgeOnline, isWeightTotalValid } from './project-progress';
import { mapProject } from './research-admin.service';

const mapTask = (row: typeof projectTask.$inferSelect): ProjectTaskItem => ({
  id: row.id, projectId: row.projectId, taskCode: row.taskCode, stageCode: row.stageCode,
  stageName: row.stageName, title: row.title, description: row.description, weight: row.weight,
  status: row.status as ProjectTaskStatus, requiresApproval: row.requiresApproval,
  deliverables: row.deliverables as string[], completionSummary: row.completionSummary, blocker: row.blocker,
  sortOrder: row.sortOrder, startedAt: row.startedAt?.toISOString() ?? null,
  completedAt: row.completedAt?.toISOString() ?? null,
});

const mapEvent = (row: typeof codexEvent.$inferSelect): CodexEventItem => ({
  id: row.id, eventId: row.eventId, projectCode: row.projectCode, threadId: row.threadId,
  taskCode: row.taskCode, eventType: row.eventType as CodexEventItem['eventType'],
  summary: row.summary, occurredAt: row.occurredAt.toISOString(),
});

@Injectable()
export class ProjectCockpitService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private async findProject(projectId: string): Promise<typeof researchProject.$inferSelect> {
    const rows = await this.db.select().from(researchProject).where(eq(researchProject.id, projectId));
    if (rows.length === 0) throw new NotFoundException('项目不存在');
    return rows[0];
  }

  async getTasks(projectId: string): Promise<ProjectTaskItem[]> {
    await this.findProject(projectId);
    const rows = await this.db.select().from(projectTask).where(eq(projectTask.projectId, projectId))
      .orderBy(asc(projectTask.sortOrder));
    return rows.map(mapTask);
  }

  async getTimeline(projectId: string): Promise<CodexEventItem[]> {
    await this.findProject(projectId);
    const rows = await this.db.select().from(codexEvent).where(eq(codexEvent.projectId, projectId))
      .orderBy(desc(codexEvent.occurredAt)).limit(50);
    return rows.map(mapEvent);
  }

  async getDetail(projectId: string): Promise<ProjectCockpitDetail> {
    const [project, tasks, timeline, bridges] = await Promise.all([
      this.findProject(projectId), this.getTasks(projectId), this.getTimeline(projectId),
      this.db.select({ lastHeartbeatAt: codexBridge.lastHeartbeatAt }).from(codexBridge),
    ]);
    const pendingApprovals = tasks.filter((task) => task.status === 'waiting_approval').length;
    const projectItem: ResearchProjectItem = mapProject(
      project, pendingApprovals, bridges.some((bridge) => isBridgeOnline(bridge.lastHeartbeatAt)),
    );
    const weightTotal = tasks.reduce((sum, task) => sum + task.weight, 0);
    return { project: projectItem, tasks, timeline, weightTotal, weightValid: isWeightTotalValid(tasks) };
  }

  async updateTask(taskId: string, input: UpdateProjectTaskRequest): Promise<ProjectCockpitDetail> {
    const rows = await this.db.select().from(projectTask).where(eq(projectTask.id, taskId));
    if (rows.length === 0) throw new NotFoundException('任务不存在');
    const task = rows[0];
    if (task.requiresApproval && input.status === 'done') {
      throw new BadRequestException('该任务需先进入待我确认，再由人工批准');
    }
    await this.applyTaskChange(task, input.status, input);
    return this.getDetail(task.projectId);
  }

  async approveTask(taskId: string): Promise<ProjectCockpitDetail> {
    const rows = await this.db.select().from(projectTask).where(eq(projectTask.id, taskId));
    if (rows.length === 0) throw new NotFoundException('任务不存在');
    const task = rows[0];
    if (!task.requiresApproval || task.status !== 'waiting_approval') {
      throw new BadRequestException('只能批准处于“待我确认”的关键任务');
    }
    await this.applyTaskChange(task, 'done', { status: 'done', summary: '人工确认通过' });
    return this.getDetail(task.projectId);
  }

  private async applyTaskChange(
    task: typeof projectTask.$inferSelect,
    status: ProjectTaskStatus,
    input: UpdateProjectTaskRequest,
  ): Promise<void> {
    const now = new Date();
    await this.db.transaction(async (tx) => {
      await tx.update(projectTask).set({
        status, completionSummary: input.summary ?? task.completionSummary,
        deliverables: input.deliverables ?? task.deliverables,
        blocker: input.blocker === undefined ? task.blocker : input.blocker,
        startedAt: status === 'running' && !task.startedAt ? now : task.startedAt,
        completedAt: status === 'done' ? now : null, updatedAt: now,
      }).where(eq(projectTask.id, task.id));
      const allTasks = await tx.select({ weight: projectTask.weight, status: projectTask.status })
        .from(projectTask).where(eq(projectTask.projectId, task.projectId));
      const normalized = allTasks.map((item) => ({ weight: item.weight, status: item.status as ProjectTaskStatus }));
      const progressPercent = calculateProgressPercent(normalized);
      const [project] = await tx.select().from(researchProject).where(eq(researchProject.id, task.projectId));
      await tx.update(researchProject).set({
        progressPercent, currentStage: task.stageName, currentTask: task.title,
        nextAction: input.nextAction === undefined ? project.nextAction : input.nextAction,
        blocker: status === 'blocked' ? (input.blocker || task.blocker || '资料不足') : null,
        codexStatus: status === 'blocked' ? 'blocked' : status === 'waiting_approval' ? 'waiting_approval' : project.codexStatus,
        lastSyncedAt: now, updatedAt: now,
      }).where(eq(researchProject.id, task.projectId));
      await tx.insert(codexEvent).values({
        eventId: `human-${randomUUID()}`, projectId: task.projectId, projectCode: project.projectCode,
        taskCode: task.taskCode, eventType: status === 'done' ? 'task_completed' : status === 'blocked' ? 'blocked' : status === 'waiting_approval' ? 'waiting_approval' : 'task_started',
        summary: input.summary || `任务状态更新为 ${status}`, payload: { source: 'admin', status }, occurredAt: now,
      });
    });
  }
}
