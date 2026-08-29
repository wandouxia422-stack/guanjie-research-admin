import { Module } from '@nestjs/common';

import { ResearchAdminController } from './research-admin.controller';
import { ResearchAdminService } from './research-admin.service';
import { BridgeTokenGuard } from './bridge-token.guard';
import { CodexBridgeController } from './codex-bridge.controller';
import { CodexSyncService } from './codex-sync.service';
import { ProjectCockpitService } from './project-cockpit.service';

@Module({
  controllers: [ResearchAdminController, CodexBridgeController],
  providers: [ResearchAdminService, ProjectCockpitService, CodexSyncService, BridgeTokenGuard],
})
export class ResearchAdminModule {}
