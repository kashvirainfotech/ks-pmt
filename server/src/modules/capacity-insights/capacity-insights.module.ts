import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { CalendarsModule } from '../calendars/calendars.module';
import { CapacityInsightsService } from './capacity-insights.service';
import { CapacityInsightsController } from './capacity-insights.controller';

@Module({
  imports: [DatabaseModule, CalendarsModule],
  controllers: [CapacityInsightsController],
  providers: [CapacityInsightsService],
  exports: [CapacityInsightsService],
})
export class CapacityInsightsModule {}
