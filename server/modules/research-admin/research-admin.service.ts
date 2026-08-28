import { randomUUID } from 'node:crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { asc, eq } from 'drizzle-orm';

import { researchProject, resourceEntry } from '@server/database/schema';
import type {
  CreateResearchProjectRequest,
  CreateResourceEntryRequest,
  ResearchAdminOverview,
  ResearchProjectItem,
  ResourceEntryItem,
} from '@shared/api.interface';

interface ResearchProjectDbRow
  extends Omit<ResearchProjectItem, 'updatedAt'> {
  updatedAt: Date;
}

interface ResourceEntryDbRow extends Omit<ResourceEntryItem, 'updatedAt'> {
  updatedAt: Date;
}

const mapProjectRow = (row: ResearchProjectDbRow): ResearchProjectItem => ({
  ...row,
  updatedAt: row.updatedAt.toISOString(),
});

const mapResourceRow = (row: ResourceEntryDbRow): ResourceEntryItem => ({
  ...row,
  updatedAt: row.updatedAt.toISOString(),
});

@Injectable()
export class ResearchAdminService {
  private readonly logger = new Logger(ResearchAdminService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async getOverview(): Promise<ResearchAdminOverview> {
    const projectDbRows: ResearchProjectDbRow[] = await this.db
      .select({
        id: researchProject.id,
        projectCode: researchProject.projectCode,
        name: researchProject.name,
        clientName: researchProject.clientName,
        category: researchProject.category,
        stageSnapshot: researchProject.stageSnapshot,
        projectStatus: researchProject.projectStatus,
        statusNote: researchProject.statusNote,
        researchLocked: researchProject.researchLocked,
        archived: researchProject.archived,
        sortOrder: researchProject.sortOrder,
        updatedAt: researchProject.updatedAt,
      })
      .from(researchProject)
      .orderBy(asc(researchProject.sortOrder));

    const resourceDbRows: ResourceEntryDbRow[] = await this.db
      .select({
        id: resourceEntry.id,
        resourceCode: resourceEntry.resourceCode,
        projectId: resourceEntry.projectId,
        title: resourceEntry.title,
        resourceType: resourceEntry.resourceType,
        appId: resourceEntry.appId,
        publicUrl: resourceEntry.publicUrl,
        adminUrl: resourceEntry.adminUrl,
        lifecycle: resourceEntry.lifecycle,
        verified: resourceEntry.verified,
        verificationNote: resourceEntry.verificationNote,
        sortOrder: resourceEntry.sortOrder,
        updatedAt: resourceEntry.updatedAt,
      })
      .from(resourceEntry)
      .orderBy(asc(resourceEntry.sortOrder));

    const projectRows: ResearchProjectItem[] = projectDbRows.map(
      (row: ResearchProjectDbRow) => mapProjectRow(row),
    );
    const resourceRows: ResourceEntryItem[] = resourceDbRows.map(
      (row: ResourceEntryDbRow) => mapResourceRow(row),
    );
    const activeResources: ResourceEntryItem[] = resourceRows.filter(
      (item: ResourceEntryItem) => item.lifecycle === 'active',
    );
    const excludedResources: ResourceEntryItem[] = resourceRows.filter(
      (item: ResourceEntryItem) => item.lifecycle === 'excluded',
    );
    const activeProjects: number = projectRows.filter(
      (item: ResearchProjectItem) => !item.archived,
    ).length;
    const verifiedResources: number = activeResources.filter(
      (item: ResourceEntryItem) => item.verified,
    ).length;

    return {
      projects: projectRows,
      activeResources,
      excludedResources,
      stats: {
        activeProjects,
        activeResources: activeResources.length,
        verifiedResources,
        excludedResources: excludedResources.length,
      },
    };
  }

  async createProject(
    input: CreateResearchProjectRequest,
  ): Promise<ResearchProjectItem> {
    const projectCode: string = `project-${randomUUID()}`;
    const rows: ResearchProjectDbRow[] = await this.db
      .insert(researchProject)
      .values({
        projectCode,
        name: input.name.trim(),
        clientName: input.clientName?.trim() || null,
        category: input.category.trim(),
        stageSnapshot: input.stageSnapshot.trim(),
        projectStatus: 'active',
        statusNote:
          input.statusNote?.trim() ||
          '仅作管理快照，本后台不会自动推进研究状态。',
        researchLocked: true,
        archived: false,
        sortOrder: 100,
      })
      .returning({
        id: researchProject.id,
        projectCode: researchProject.projectCode,
        name: researchProject.name,
        clientName: researchProject.clientName,
        category: researchProject.category,
        stageSnapshot: researchProject.stageSnapshot,
        projectStatus: researchProject.projectStatus,
        statusNote: researchProject.statusNote,
        researchLocked: researchProject.researchLocked,
        archived: researchProject.archived,
        sortOrder: researchProject.sortOrder,
        updatedAt: researchProject.updatedAt,
      });
    this.logger.log(`Created research project ${projectCode}`);
    return mapProjectRow(rows[0]);
  }

  async createResource(
    input: CreateResourceEntryRequest,
  ): Promise<ResourceEntryItem> {
    if (input.projectId) {
      const projectRows: Array<{ id: string }> = await this.db
        .select({ id: researchProject.id })
        .from(researchProject)
        .where(eq(researchProject.id, input.projectId));
      if (projectRows.length === 0) throw new Error('关联项目不存在');
    }

    const resourceCode: string = `resource-${randomUUID()}`;
    const rows: ResourceEntryDbRow[] = await this.db
      .insert(resourceEntry)
      .values({
        resourceCode,
        projectId: input.projectId || null,
        title: input.title.trim(),
        resourceType: input.resourceType.trim(),
        appId: input.appId?.trim() || null,
        publicUrl: input.publicUrl.trim(),
        adminUrl: input.adminUrl?.trim() || null,
        lifecycle: 'active',
        verified: false,
        verificationNote:
          input.verificationNote?.trim() || '新增入口，待人工核验。',
        sortOrder: 200,
      })
      .returning({
        id: resourceEntry.id,
        resourceCode: resourceEntry.resourceCode,
        projectId: resourceEntry.projectId,
        title: resourceEntry.title,
        resourceType: resourceEntry.resourceType,
        appId: resourceEntry.appId,
        publicUrl: resourceEntry.publicUrl,
        adminUrl: resourceEntry.adminUrl,
        lifecycle: resourceEntry.lifecycle,
        verified: resourceEntry.verified,
        verificationNote: resourceEntry.verificationNote,
        sortOrder: resourceEntry.sortOrder,
        updatedAt: resourceEntry.updatedAt,
      });
    this.logger.log(`Created resource entry ${resourceCode}`);
    return mapResourceRow(rows[0]);
  }
}
