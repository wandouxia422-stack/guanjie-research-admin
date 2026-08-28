import { Body, Controller, Get, Post } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import {
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';

import type {
  CreateResearchProjectRequest,
  CreateResourceEntryRequest,
  ResearchAdminOverview,
  ResearchProjectItem,
  ResourceEntryItem,
} from '@shared/api.interface';

import { ResearchAdminService } from './research-admin.service';

class CreateResearchProjectDto implements CreateResearchProjectRequest {
  @IsString()
  @Length(2, 200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  clientName?: string;

  @IsString()
  @Length(2, 100)
  category!: string;

  @IsString()
  @Length(2, 200)
  stageSnapshot!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  statusNote?: string;
}

class CreateResourceEntryDto implements CreateResourceEntryRequest {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  @Length(2, 200)
  title!: string;

  @IsString()
  @Length(2, 80)
  resourceType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  appId?: string;

  @IsUrl({ require_tld: true })
  publicUrl!: string;

  @IsOptional()
  @IsUrl({ require_tld: true })
  adminUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  verificationNote?: string;
}

@Controller('api/research-admin')
export class ResearchAdminController {
  constructor(private readonly researchAdminService: ResearchAdminService) {}

  @NeedLogin()
  @Get('overview')
  async getOverview(): Promise<ResearchAdminOverview> {
    return this.researchAdminService.getOverview();
  }

  @NeedLogin()
  @Post('projects')
  async createProject(
    @Body() dto: CreateResearchProjectDto,
  ): Promise<ResearchProjectItem> {
    return this.researchAdminService.createProject(dto);
  }

  @NeedLogin()
  @Post('resources')
  async createResource(
    @Body() dto: CreateResourceEntryDto,
  ): Promise<ResourceEntryItem> {
    return this.researchAdminService.createResource(dto);
  }
}
