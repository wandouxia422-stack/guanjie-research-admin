import { randomUUID } from 'node:crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { asc, eq } from 'drizzle-orm';

import {
  codexBridge, projectTask, projectTaskTemplate, projectTaskTemplateItem,
  researchProject, resourceEntry,
} from '@server/database/schema';
import type {
  CreateResearchProjectRequest, CreateResourceEntryRequest, ResearchAdminOverview,
  ResearchProjectItem, ResourceEntryItem,
  ProjectTaskTemplate, UpdateProjectTaskTemplateItemRequest,
} from '@shared/api.interface';
import { isBridgeOnline, isWeightTotalValid } from './project-progress';

type ProjectRow = typeof researchProject.$inferSelect;
type ResourceRow = typeof resourceEntry.$inferSelect;

const mapProject = (
  row: ProjectRow,
  pendingApprovals = 0,
  bridgeOnline = false,
): ResearchProjectItem => ({
  id: row.id, projectCode: row.projectCode, name: row.name, clientName: row.clientName,
  category: row.category, stageSnapshot: row.stageSnapshot, projectStatus: row.projectStatus,
  statusNote: row.statusNote, researchLocked: row.researchLocked, archived: row.archived,
  sortOrder: row.sortOrder, progressPercent: row.progressPercent, codexStatus: row.codexStatus,
  currentStage: row.currentStage, currentTask: row.currentTask, nextAction: row.nextAction,
  blocker: row.blocker, codexThreadId: row.codexThreadId, repoFullName: row.repoFullName,
  repoLocalPath: row.repoLocalPath, lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
  pendingApprovals, bridgeOnline, updatedAt: row.updatedAt.toISOString(),
});

const mapResource = (row: ResourceRow): ResourceEntryItem => ({
  id: row.id, resourceCode: row.resourceCode, projectId: row.projectId, title: row.title,
  resourceType: row.resourceType, appId: row.appId, publicUrl: row.publicUrl,
  adminUrl: row.adminUrl, lifecycle: row.lifecycle, verified: row.verified,
  verificationNote: row.verificationNote, sortOrder: row.sortOrder,
  updatedAt: row.updatedAt.toISOString(),
});

@Injectable()
export class ResearchAdminService {
  private readonly logger = new Logger(ResearchAdminService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async getOverview(): Promise<ResearchAdminOverview> {
    const [projects, resources, tasks, bridges] = await Promise.all([
      this.db.select().from(researchProject).orderBy(asc(researchProject.sortOrder)),
      this.db.select().from(resourceEntry).orderBy(asc(resourceEntry.sortOrder)),
      this.db.select({ projectId: projectTask.projectId, status: projectTask.status }).from(projectTask),
      this.db.select({ lastHeartbeatAt: codexBridge.lastHeartbeatAt }).from(codexBridge),
    ]);
    const online = bridges.some((bridge) => isBridgeOnline(bridge.lastHeartbeatAt));
    const projectRows = projects.map((row) => mapProject(
      row,
      tasks.filter((task) => task.projectId === row.id && task.status === 'waiting_approval').length,
      online,
    ));
    const resourceRows = resources.map(mapResource);
    const activeResources = resourceRows.filter((item) => item.lifecycle === 'active');
    const excludedResources = resourceRows.filter((item) => item.lifecycle === 'excluded');
    return {
      projects: projectRows, activeResources, excludedResources,
      stats: {
        activeProjects: projectRows.filter((item) => !item.archived).length,
        activeResources: activeResources.length,
        verifiedResources: activeResources.filter((item) => item.verified).length,
        excludedResources: excludedResources.length,
      },
    };
  }

  async createProject(input: CreateResearchProjectRequest): Promise<ResearchProjectItem> {
    const projectCode = `project-${randomUUID()}`;
    const templateCode = input.templateCode ?? 'brand-full-case-v1';
    const templateRows = await this.db.select().from(projectTaskTemplate)
      .where(eq(projectTaskTemplate.templateCode, templateCode));
    if (templateRows.length === 0 || !templateRows[0].enabled) throw new Error('项目任务模板不存在或未启用');
    const templateItems = await this.db.select().from(projectTaskTemplateItem)
      .where(eq(projectTaskTemplateItem.templateId, templateRows[0].id))
      .orderBy(asc(projectTaskTemplateItem.sortOrder));
    if (!isWeightTotalValid(templateItems.map((item) => ({ weight: item.weight, status: 'todo' })))) {
      throw new Error('项目任务模板权重合计必须为 100');
    }
    const created = await this.db.transaction(async (tx) => {
      const [project] = await tx.insert(researchProject).values({
        projectCode, name: input.name.trim(), clientName: input.clientName?.trim() || null,
        category: input.category.trim(), stageSnapshot: input.stageSnapshot.trim(), projectStatus: 'active',
        statusNote: input.statusNote?.trim() || '仅作管理快照，本后台不会自动推进研究状态。',
        researchLocked: true, archived: false, sortOrder: 100, repoFullName: input.repoFullName?.trim() || null,
        repoLocalPath: input.repoLocalPath?.trim() || null,
      }).returning();
      await tx.insert(projectTask).values(templateItems.map((item) => ({
        projectId: project.id, taskCode: item.taskCode, stageCode: item.stageCode,
        stageName: item.stageName, title: item.title, description: item.description,
        weight: item.weight, status: 'todo', requiresApproval: item.requiresApproval,
        deliverables: [], sortOrder: item.sortOrder,
      })));
      return project;
    });
    this.logger.log(`Created project ${projectCode} from template ${templateCode}`);
    return mapProject(created);
  }

  async getTaskTemplates(): Promise<ProjectTaskTemplate[]> {
    const [templates, items] = await Promise.all([
      this.db.select().from(projectTaskTemplate).orderBy(asc(projectTaskTemplate.name)),
      this.db.select().from(projectTaskTemplateItem).orderBy(asc(projectTaskTemplateItem.sortOrder)),
    ]);
    return templates.map((template) => ({
      id: template.id, templateCode: template.templateCode, name: template.name,
      category: template.category, description: template.description, enabled: template.enabled,
      items: items.filter((item) => item.templateId === template.id).map((item) => ({
        id: item.id, taskCode: item.taskCode, stageCode: item.stageCode, stageName: item.stageName,
        title: item.title, description: item.description, weight: item.weight,
        requiresApproval: item.requiresApproval, sortOrder: item.sortOrder,
      })),
    }));
  }

  async updateTemplateItem(
    itemId: string,
    input: UpdateProjectTaskTemplateItemRequest,
  ): Promise<ProjectTaskTemplate[]> {
    const rows = await this.db.select().from(projectTaskTemplateItem)
      .where(eq(projectTaskTemplateItem.id, itemId));
    if (rows.length === 0) throw new Error('模板任务不存在');
    const siblings = await this.db.select().from(projectTaskTemplateItem)
      .where(eq(projectTaskTemplateItem.templateId, rows[0].templateId));
    const nextWeight = input.weight ?? rows[0].weight;
    const total = siblings.reduce((sum, item) => sum + (item.id === itemId ? nextWeight : item.weight), 0);
    if (total !== 100) throw new Error(`修改后模板权重合计为 ${total}，必须保持 100`);
    await this.db.update(projectTaskTemplateItem).set({
      stageName: input.stageName?.trim() ?? rows[0].stageName,
      title: input.title?.trim() ?? rows[0].title,
      description: input.description?.trim() ?? rows[0].description,
      weight: nextWeight, requiresApproval: input.requiresApproval ?? rows[0].requiresApproval,
      sortOrder: input.sortOrder ?? rows[0].sortOrder, updatedAt: new Date(),
    }).where(eq(projectTaskTemplateItem.id, itemId));
    return this.getTaskTemplates();
  }

  async createResource(input: CreateResourceEntryRequest): Promise<ResourceEntryItem> {
    if (input.projectId) {
      const rows = await this.db.select({ id: researchProject.id }).from(researchProject)
        .where(eq(researchProject.id, input.projectId));
      if (rows.length === 0) throw new Error('关联项目不存在');
    }
    const [row] = await this.db.insert(resourceEntry).values({
      resourceCode: `resource-${randomUUID()}`, projectId: input.projectId || null,
      title: input.title.trim(), resourceType: input.resourceType.trim(), appId: input.appId?.trim() || null,
      publicUrl: input.publicUrl.trim(), adminUrl: input.adminUrl?.trim() || null,
      lifecycle: 'active', verified: false,
      verificationNote: input.verificationNote?.trim() || '新增入口，待人工核验。', sortOrder: 200,
    }).returning();
    this.logger.log(`Created resource ${row.resourceCode}`);
    return mapResource(row);
  }
}

export { mapProject };
