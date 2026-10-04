import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { FinancialAnalyticsService } from './financial-analytics.service';
import { FinancialAnalyticsController } from './financial-analytics.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [FinancialAnalyticsController],
  providers: [FinancialAnalyticsService],
  exports: [FinancialAnalyticsService],
})
export class FinancialAnalyticsModule {}
