import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { IsArray, IsISO8601, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

import type {
  BridgeHeartbeatRequest, CodexEventRequest, CodexJobItem, CompleteCodexJobRequest,
} from '@shared/api.interface';
import { BridgeTokenGuard } from './bridge-token.guard';
import { CodexSyncService } from './codex-sync.service';

class CodexEventDto implements CodexEventRequest {
  @IsString() @MaxLength(200) eventId!: string;
  @IsString() @MaxLength(100) projectCode!: string;
  @IsString() @MaxLength(200) threadId!: string;
  @IsOptional() @IsString() @MaxLength(100) taskCode?: string;
  @IsIn(['run_started','task_started','task_completed','waiting_approval','blocked','run_paused','run_failed','run_completed']) @Type(() => String) eventType!: CodexEventRequest['eventType'];
  @IsString() @MaxLength(4000) summary!: string;
  @IsArray() @IsString({ each: true }) @Type(() => String) deliverables!: string[];
  @IsOptional() @IsString() @MaxLength(4000) blocker!: string | null;
  @IsOptional() @IsString() @MaxLength(4000) nextAction!: string | null;
  @IsISO8601() occurredAt!: string;
}

class HeartbeatDto implements BridgeHeartbeatRequest {
  @IsString() @MaxLength(200) bridgeId!: string;
  @IsOptional() @IsString() @MaxLength(2000) projectRoot?: string;
}

class ClaimDto { @IsString() @MaxLength(200) bridgeId!: string; }
class CompleteJobDto extends ClaimDto implements CompleteCodexJobRequest {
  @IsIn(['completed', 'failed']) status!: 'completed' | 'failed';
  @IsOptional() @IsString() @MaxLength(200) threadId?: string;
  @IsOptional() @IsString() @MaxLength(4000) summary?: string;
  @IsOptional() @IsString() @MaxLength(4000) errorMessage?: string;
}

@UseGuards(BridgeTokenGuard)
@Controller('api/research-admin/bridge')
export class CodexBridgeController {
  constructor(private readonly service: CodexSyncService) {}

  @Post('events') receiveEvent(@Body() dto: CodexEventDto): Promise<{ accepted: boolean; duplicate: boolean }> {
    return this.service.receiveEvent(dto);
  }

  @Post('heartbeat') heartbeat(@Body() dto: HeartbeatDto): Promise<{ online: true; serverTime: string }> {
    return this.service.heartbeat(dto);
  }

  @Post('jobs/claim') claim(@Body() dto: ClaimDto): Promise<CodexJobItem | null> {
    return this.service.claimJob(dto.bridgeId);
  }

  @Post('jobs/:jobId/running') async running(@Param('jobId') jobId: string, @Body() dto: ClaimDto): Promise<{ ok: true }> {
    await this.service.markJobRunning(jobId, dto.bridgeId);
    return { ok: true };
  }

  @Post('jobs/:jobId/complete') async complete(
    @Param('jobId') jobId: string,
    @Body() dto: CompleteJobDto,
  ): Promise<{ ok: true }> {
    await this.service.completeJob(jobId, dto.bridgeId, dto);
    return { ok: true };
  }
}
