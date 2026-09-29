import { Module } from '@nestjs/common';
import { TimesheetsService } from './timesheets.service';
import { TimesheetsController } from './timesheets.controller';
import { DatabaseModule } from '../../database/database.module';
import { CalendarsModule } from '../calendars/calendars.module';

@Module({
  imports: [DatabaseModule, CalendarsModule],
  controllers: [TimesheetsController],
  providers: [TimesheetsService],
  exports: [TimesheetsService],
})
export class TimesheetsModule {}
