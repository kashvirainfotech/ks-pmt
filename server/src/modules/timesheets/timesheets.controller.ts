import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TimesheetsService } from './timesheets.service';
import { QueryTimesheetDto } from './dto/query-timesheet.dto';
import { SubmitTimesheetDto } from './dto/submit-timesheet.dto';
import { ReviewTimesheetPortionDto } from './dto/review-timesheet-portion.dto';
import { StartTimerDto } from './dto/start-timer.dto';
import { StopTimerDto } from './dto/stop-timer.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/validators/record-id';

@ApiTags('Timesheets & Persistent Timer (TIME-001)')
@ApiBearerAuth('JWT-auth')
@Controller('timesheets')
export class TimesheetsController {
  constructor(private readonly timesheetsService: TimesheetsService) {}

  // ==========================================
  // Timer Endpoints (Global Across Tabs & Devices)
  // ==========================================

  @Get('timer/active')
  @RequirePermissions('TIMELOGS:READ')
  @ApiOperation({ summary: 'Get current user active timer session' })
  async getActiveTimer(@CurrentUser('id') userId: string) {
    return { data: await this.timesheetsService.getActiveTimer(userId) };
  }

  @Post('timer/start')
  @RequirePermissions('TIMELOGS:CREATE')
  @ApiOperation({ summary: 'Start or switch active timer on a task' })
  async startTimer(
    @Body() dto: StartTimerDto,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.timesheetsService.startTimer(userId, dto) };
  }

  @Post('timer/pause')
  @RequirePermissions('TIMELOGS:CREATE')
  @ApiOperation({ summary: 'Pause the current active timer session' })
  async pauseTimer(@CurrentUser('id') userId: string) {
    return { data: await this.timesheetsService.pauseTimer(userId) };
  }

  @Post('timer/resume')
  @RequirePermissions('TIMELOGS:CREATE')
  @ApiOperation({ summary: 'Resume a paused timer session' })
  async resumeTimer(@CurrentUser('id') userId: string) {
    return { data: await this.timesheetsService.resumeTimer(userId) };
  }

  @Post('timer/stop')
  @RequirePermissions('TIMELOGS:CREATE')
  @ApiOperation({ summary: 'Stop the active timer and log time to task worklogs' })
  async stopAndLogTimer(
    @Body() dto: StopTimerDto,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.timesheetsService.stopAndLogTimer(userId, dto) };
  }

  @Delete('timer')
  @RequirePermissions('TIMELOGS:CREATE')
  @ApiOperation({ summary: 'Discard the active timer session without logging time' })
  async discardTimer(@CurrentUser('id') userId: string) {
    return { data: await this.timesheetsService.discardTimer(userId) };
  }

  // ==========================================
  // Weekly Timesheet Grid & Submission
  // ==========================================

  @Get('weekly')
  @RequirePermissions('TIMESHEETS:READ')
  @ApiOperation({ summary: 'Get weekly timesheet grid with calendar expected hours calculation' })
  async getWeekly(
    @Query() query: QueryTimesheetDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    const targetUserId = query.userId || currentUserId;
    return { data: await this.timesheetsService.getWeeklyTimesheet(targetUserId, query.startDate) };
  }

  @Post(':id/submit')
  @RequirePermissions('TIMESHEETS:SUBMIT')
  @ApiOperation({ summary: 'Submit weekly timesheet and split into project portions' })
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitTimesheetDto,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.timesheetsService.submitTimesheet(id, userId, dto) };
  }

  @Post('portions/:portionId/review')
  @RequirePermissions('TIMESHEETS:APPROVE')
  @ApiOperation({ summary: 'Review (approve/reject) a cross-project timesheet portion' })
  async reviewPortion(
    @Param('portionId', ParseUUIDPipe) portionId: string,
    @Body() dto: ReviewTimesheetPortionDto,
    @CurrentUser('id') reviewerId: string,
    @Req() request: any,
  ) {
    const isSuperAdmin = request.userEffectivePermissions?.roleCode === 'ROLE_SUPER_ADMIN';
    return {
      data: await this.timesheetsService.reviewPortion(
        portionId,
        dto,
        reviewerId,
        isSuperAdmin,
      ),
    };
  }

  @Post(':id/reopen')
  @RequirePermissions('TIMESHEETS:SUBMIT')
  @ApiOperation({ summary: 'Reopen an approved/submitted timesheet for amendment' })
  async reopen(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body('reason') reason?: string,
  ) {
    return { data: await this.timesheetsService.reopenTimesheet(id, userId, reason) };
  }
}
