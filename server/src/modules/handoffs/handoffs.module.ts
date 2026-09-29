import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { CalendarsModule } from '../calendars/calendars.module';
import { HandoffsController } from './handoffs.controller';
import { HandoffsService } from './handoffs.service';

@Module({
  imports: [DatabaseModule, CalendarsModule],
  controllers: [HandoffsController],
  providers: [HandoffsService],
  exports: [HandoffsService],
})
export class HandoffsModule {}
