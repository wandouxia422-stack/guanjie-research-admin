import { Module } from '@nestjs/common';

import { ResearchAdminController } from './research-admin.controller';
import { ResearchAdminService } from './research-admin.service';

@Module({
  controllers: [ResearchAdminController],
  providers: [ResearchAdminService],
})
export class ResearchAdminModule {}
