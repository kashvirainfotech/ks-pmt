import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { FlowAnalyticsService } from './flow-analytics.service';
import { FlowAnalyticsController } from './flow-analytics.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [FlowAnalyticsController],
  providers: [FlowAnalyticsService],
  exports: [FlowAnalyticsService],
})
export class FlowAnalyticsModule {}
