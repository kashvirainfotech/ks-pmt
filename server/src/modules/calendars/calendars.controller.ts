import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CalendarsService } from './calendars.service';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { UpdateCalendarDto } from './dto/update-calendar.dto';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { AssignCalendarDto } from './dto/assign-calendar.dto';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { ReviewLeaveDto } from './dto/review-leave.dto';
import { QueryCalendarDto, QueryLeaveDto } from './dto/query-calendar.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/validators/record-id';

@ApiTags('Working Calendars & Employee Schedules (FND-001)')
@ApiBearerAuth('JWT-auth')
@Controller('calendars')
export class CalendarsController {
  constructor(private readonly calendarsService: CalendarsService) {}

  // ==========================================
  // WORKING CALENDARS
  // ==========================================

  @Post()
  @RequirePermissions('CALENDARS:MANAGE')
  @ApiOperation({ summary: 'Create a new working calendar definition' })
  async create(
    @Body() dto: CreateCalendarDto,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.calendarsService.create(dto, userId) };
  }

  @Get()
  @RequirePermissions('CALENDARS:READ')
  @ApiOperation({ summary: 'List working calendars with pagination and filters' })
  async findAll(@Query() query: QueryCalendarDto) {
    const result = await this.calendarsService.findAll(query);
    return {
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  @Get(':id')
  @RequirePermissions('CALENDARS:READ')
  @ApiOperation({ summary: 'Get calendar details and public holidays by ID' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.calendarsService.findById(id) };
  }

  @Put(':id')
  @RequirePermissions('CALENDARS:MANAGE')
  @ApiOperation({ summary: 'Update working calendar details' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCalendarDto,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.calendarsService.update(id, dto, userId) };
  }

  @Delete(':id')
  @RequirePermissions('CALENDARS:MANAGE')
  @ApiOperation({ summary: 'Soft delete a working calendar' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.calendarsService.remove(id, userId) };
  }

  // ==========================================
  // HOLIDAYS
  // ==========================================

  @Get(':id/holidays')
  @RequirePermissions('CALENDARS:READ')
  @ApiOperation({ summary: 'Get all active holidays for a calendar' })
  async getHolidays(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('year') year?: number,
  ) {
    return { data: await this.calendarsService.getHolidays(id, year) };
  }

  @Post('holidays')
  @RequirePermissions('CALENDARS:MANAGE')
  @ApiOperation({ summary: 'Add a holiday to a calendar' })
  async addHoliday(
    @Body() dto: CreateHolidayDto,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.calendarsService.addHoliday(dto, userId) };
  }

  @Delete('holidays/:holidayId')
  @RequirePermissions('CALENDARS:MANAGE')
  @ApiOperation({ summary: 'Delete a holiday record' })
  async removeHoliday(@Param('holidayId', ParseUUIDPipe) holidayId: string) {
    return { data: await this.calendarsService.removeHoliday(holidayId) };
  }

  // ==========================================
  // SCHEDULE ASSIGNMENTS & CAPACITY
  // ==========================================

  @Post('assignments')
  @RequirePermissions('CALENDARS:MANAGE')
  @ApiOperation({ summary: 'Assign a working calendar and schedule to an employee' })
  async assignCalendar(
    @Body() dto: AssignCalendarDto,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.calendarsService.assignCalendar(dto, userId) };
  }

  @Get('assignments/user/:userId')
  @RequirePermissions('CALENDARS:READ')
  @ApiOperation({ summary: 'List calendar assignment history for an employee' })
  async getAssignmentsByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return { data: await this.calendarsService.getAssignmentsByUser(userId) };
  }

  @Get('effective-schedule')
  @RequirePermissions('CALENDARS:READ')
  @ApiOperation({ summary: 'Resolve active calendar and working status for a user on a given date' })
  async getEffectiveSchedule(
    @Query('userId', ParseUUIDPipe) userId: string,
    @Query('date') date: string,
  ) {
    return {
      data: await this.calendarsService.isWorkingDay(
        userId,
        date || new Date().toISOString().split('T')[0],
      ),
    };
  }

  @Get('capacity-check')
  @RequirePermissions('CALENDARS:READ')
  @ApiOperation({ summary: 'Calculate net working days and delivery hours across a date range' })
  async checkCapacity(
    @Query('userId', ParseUUIDPipe) userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return {
      data: await this.calendarsService.calculateWorkingCapacity(
        userId,
        startDate,
        endDate,
      ),
    };
  }

  // ==========================================
  // EMPLOYEE LEAVES
  // ==========================================

  @Post('leaves')
  @ApiOperation({ summary: 'Submit an employee leave request' })
  async createLeave(
    @Body() dto: CreateLeaveDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('permissions') permissions: string[] = [],
  ) {
    const canApprove = permissions?.includes('LEAVES:MANAGE') || permissions?.includes('SUPER_ADMIN');
    return {
      data: await this.calendarsService.createLeave(dto, userId, canApprove),
    };
  }

  @Get('leaves')
  @ApiOperation({ summary: 'List leave requests (filtered by user or all if manager)' })
  async findAllLeaves(
    @Query() query: QueryLeaveDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('permissions') permissions: string[] = [],
  ) {
    const canManage = permissions?.includes('LEAVES:MANAGE') || permissions?.includes('SUPER_ADMIN');
    // If user lacks management permissions, force filter to their own leaves
    if (!canManage) {
      query.userId = userId;
    }
    const result = await this.calendarsService.findAllLeaves(query);
    return {
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  @Patch('leaves/:id/review')
  @RequirePermissions('LEAVES:MANAGE')
  @ApiOperation({ summary: 'Approve, reject, or cancel an employee leave request' })
  async reviewLeave(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewLeaveDto,
    @CurrentUser('id') reviewerUserId: string,
  ) {
    return {
      data: await this.calendarsService.reviewLeave(id, dto, reviewerUserId),
    };
  }
}
