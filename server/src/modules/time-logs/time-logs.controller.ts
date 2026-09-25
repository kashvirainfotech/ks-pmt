import { ParseUUIDPipe } from '../../common/validators/record-id';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TimeLogsService } from './time-logs.service';
import { CreateTimeLogDto } from './dto/create-time-log.dto';
import { QueryTimeLogDto } from './dto/query-time-log.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReviewTimeLogDto } from './dto/review-time-log.dto';

@ApiTags('Time Tracking & Worklogs')
@ApiBearerAuth('JWT-auth')
@Controller('time-logs')
export class TimeLogsController {
  constructor(private readonly timeLogsService: TimeLogsService) {}

  @Patch(':id/submit')
  @RequirePermissions('TIMELOGS:LOG_OWN')
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.timeLogsService.submit(id, userId) };
  }

  @Patch(':id/review')
  @RequirePermissions('TIMELOGS:APPROVE')
  async review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewTimeLogDto,
    @CurrentUser('id') userId: string,
  ) {
    return {
      data: await this.timeLogsService.review(
        id,
        dto.status,
        dto.remarks,
        userId,
      ),
    };
  }

  @Post()
  @RequirePermissions('TIMELOGS:LOG_OWN')
  @ApiOperation({
    summary: 'Log work effort / hours spent on a task',
    description:
      'Captures hours spent, date, billable flag, summary, and optional start/stop timer timestamps.',
  })
  @ApiResponse({ status: 201, description: 'Worklog recorded successfully' })
  async create(
    @Body() dto: CreateTimeLogDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.timeLogsService.create(dto, userId);
    return {
      message: 'Effort logged successfully',
      data,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all timesheet worklogs with pagination and filtering',
  })
  async findAll(@Query() query: QueryTimeLogDto, @CurrentUser() user: any) {
    const permissions = await this.timeLogsService.canReview(
      user.id,
      user.primaryBranchId,
    );
    if (!permissions) query.userId = user.id;
    const data = await this.timeLogsService.findAll(query);
    return {
      message: 'Worklogs retrieved successfully',
      data,
    };
  }

  @Get('task/:taskId')
  @ApiOperation({
    summary: 'Get all worklogs for a task with billable/non-billable totals',
    description:
      'Calls PostgreSQL stored function fn_calculate_task_effort to aggregate effort.',
  })
  async findByTask(@Param('taskId', ParseUUIDPipe) taskId: string) {
    const data = await this.timeLogsService.findByTask(taskId);
    return {
      message: 'Task worklogs retrieved successfully',
      data,
    };
  }

  @Get('my-logs')
  @ApiOperation({
    summary:
      'Get current employee timesheet worklogs with date range filtering',
  })
  async findMyLogs(
    @CurrentUser('id') userId: string,
    @Query() query: QueryTimeLogDto,
  ) {
    const data = await this.timeLogsService.findMyLogs(userId, query);
    return {
      message: 'Personal worklogs retrieved successfully',
      data,
    };
  }

  @Get('employee-workload')
  @ApiOperation({
    summary: 'Get team-wide employee workload summary',
    description:
      'Queries vw_employee_workload view: active task counts, estimated hours, and 30-day billables.',
  })
  async getEmployeeWorkload() {
    const data = await this.timeLogsService.getEmployeeWorkload();
    return {
      message: 'Employee workload summary retrieved successfully',
      data,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a logged worklog entry' })
  async deleteLog(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('roleCode') roleCode: string,
  ) {
    const data = await this.timeLogsService.deleteLog(id, userId, roleCode);
    return {
      message: data.message,
      data: { success: data.success },
    };
  }
}
