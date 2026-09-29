import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ClientReportsService } from './client-reports.service';
import { ClientReportsController } from './client-reports.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [ClientReportsController],
  providers: [ClientReportsService],
  exports: [ClientReportsService],
})
export class ClientReportsModule {}
