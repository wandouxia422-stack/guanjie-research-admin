import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUrl, Length, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

import type {
  CodexEventItem, CodexJobItem, CreateResearchProjectRequest, CreateResourceEntryRequest,
  ProjectCockpitDetail, ProjectTaskItem, ResearchAdminOverview, ResearchProjectItem,
  ResourceEntryItem, UpdateProjectTaskRequest,
  ProjectTaskTemplate, UpdateProjectTaskTemplateItemRequest,
} from '@shared/api.interface';
import { CodexSyncService } from './codex-sync.service';
import { ProjectCockpitService } from './project-cockpit.service';
import { ResearchAdminService } from './research-admin.service';

class CreateResearchProjectDto implements CreateResearchProjectRequest {
  @IsString() @Length(2, 200) name!: string;
  @IsOptional() @IsString() @MaxLength(200) clientName?: string;
  @IsString() @Length(2, 100) category!: string;
  @IsString() @Length(2, 200) stageSnapshot!: string;
  @IsOptional() @IsString() @MaxLength(2000) statusNote?: string;
  @IsOptional() @IsString() @MaxLength(100) templateCode?: string;
  @IsOptional() @IsString() @MaxLength(300) repoFullName?: string;
  @IsOptional() @IsString() @MaxLength(2000) repoLocalPath?: string;
}

class CreateResourceEntryDto implements CreateResourceEntryRequest {
  @IsOptional() @IsString() projectId?: string;
  @IsString() @Length(2, 200) title!: string;
  @IsString() @Length(2, 80) resourceType!: string;
  @IsOptional() @IsString() @MaxLength(100) appId?: string;
  @IsUrl({ require_tld: true }) publicUrl!: string;
  @IsOptional() @IsUrl({ require_tld: true }) adminUrl?: string;
  @IsOptional() @IsString() @MaxLength(2000) verificationNote?: string;
}

class UpdateTaskDto implements UpdateProjectTaskRequest {
  @IsIn(['todo', 'running', 'waiting_approval', 'blocked', 'done']) @Type(() => String) status!: UpdateProjectTaskRequest['status'];
  @IsOptional() @IsString() @MaxLength(4000) summary?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) @Type(() => String) deliverables?: string[];
  @IsOptional() @IsString() @MaxLength(4000) blocker?: string | null;
  @IsOptional() @IsString() @MaxLength(4000) nextAction?: string | null;
}

class UpdateTemplateItemDto implements UpdateProjectTaskTemplateItemRequest {
  @IsOptional() @IsString() @MaxLength(200) stageName?: string;
  @IsOptional() @IsString() @MaxLength(300) title?: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100) weight?: number;
  @IsOptional() @IsBoolean() requiresApproval?: boolean;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

@Controller('api/research-admin')
export class ResearchAdminController {
  constructor(
    private readonly researchAdminService: ResearchAdminService,
    private readonly cockpitService: ProjectCockpitService,
    private readonly codexSyncService: CodexSyncService,
  ) {}

  @NeedLogin() @Get('overview')
  getOverview(): Promise<ResearchAdminOverview> { return this.researchAdminService.getOverview(); }

  @NeedLogin() @Post('projects')
  createProject(@Body() dto: CreateResearchProjectDto): Promise<ResearchProjectItem> {
    return this.researchAdminService.createProject(dto);
  }

  @NeedLogin() @Get('task-templates')
  getTaskTemplates(): Promise<ProjectTaskTemplate[]> {
    return this.researchAdminService.getTaskTemplates();
  }

  @NeedLogin() @Patch('task-template-items/:itemId')
  updateTemplateItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateTemplateItemDto,
  ): Promise<ProjectTaskTemplate[]> {
    return this.researchAdminService.updateTemplateItem(itemId, dto);
  }

  @NeedLogin() @Post('resources')
  createResource(@Body() dto: CreateResourceEntryDto): Promise<ResourceEntryItem> {
    return this.researchAdminService.createResource(dto);
  }

  @NeedLogin() @Get('projects/:projectId/cockpit')
  getCockpit(@Param('projectId') projectId: string): Promise<ProjectCockpitDetail> {
    return this.cockpitService.getDetail(projectId);
  }

  @NeedLogin() @Get('projects/:projectId/tasks')
  getTasks(@Param('projectId') projectId: string): Promise<ProjectTaskItem[]> {
    return this.cockpitService.getTasks(projectId);
  }

  @NeedLogin() @Get('projects/:projectId/timeline')
  getTimeline(@Param('projectId') projectId: string): Promise<CodexEventItem[]> {
    return this.cockpitService.getTimeline(projectId);
  }

  @NeedLogin() @Patch('tasks/:taskId/status')
  updateTask(@Param('taskId') taskId: string, @Body() dto: UpdateTaskDto): Promise<ProjectCockpitDetail> {
    return this.cockpitService.updateTask(taskId, dto);
  }

  @NeedLogin() @Post('tasks/:taskId/approve')
  approveTask(@Param('taskId') taskId: string): Promise<ProjectCockpitDetail> {
    return this.cockpitService.approveTask(taskId);
  }

  @NeedLogin() @Post('projects/:projectId/jobs/continue')
  createContinueJob(@Param('projectId') projectId: string): Promise<CodexJobItem> {
    return this.codexSyncService.createContinueJob(projectId);
  }
}
