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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Permissions } from '../rbac/rbac.decorator';
import { DynamicRbacGuard } from '../rbac/rbac.guard';
import { ParseUUIDPipe } from '../../common/validators/record-id';
import { QaService } from './qa.service';
import {
  CreateTestSuiteDto,
  UpdateTestSuiteDto,
} from './dto/create-test-suite.dto';
import {
  CreateTestCaseDto,
  UpdateTestCaseDto,
} from './dto/create-test-case.dto';
import {
  CreateTestRunDto,
  UpdateTestRunDto,
} from './dto/create-test-run.dto';
import {
  ExecuteTestRunItemDto,
  LogDefectFromRunItemDto,
} from './dto/execute-test-run-item.dto';
import {
  CreateReleaseChecklistDto,
} from './dto/create-release-checklist.dto';
import {
  SignoffChecklistDto,
  UpdateChecklistItemDto,
} from './dto/signoff-checklist.dto';
import {
  QueryReleaseChecklistsDto,
  QueryTestCasesDto,
  QueryTestRunsDto,
  QueryTestSuitesDto,
} from './dto/query-qa.dto';
import {
  CreateQaEnvironmentDto,
  UpdateQaEnvironmentDto,
} from './dto/create-qa-environment.dto';
import { CreateIssueObservationDto } from './dto/create-issue-observation.dto';
import {
  QueryQaEnvironmentsDto,
  QueryIssueObservationsDto,
} from './dto/query-qa-environments.dto';

@Controller('qa')
@UseGuards(JwtAuthGuard, DynamicRbacGuard)
export class QaController {
  constructor(private readonly qaService: QaService) {}

  // ========================================================
  // Test Suites
  // ========================================================

  @Post('suites')
  @Permissions('TESTING:MANAGE')
  async createTestSuite(@Body() dto: CreateTestSuiteDto, @Req() req: any) {
    return await this.qaService.createTestSuite(dto, req.user.id);
  }

  @Get('suites')
  @Permissions('TESTING:READ')
  async getTestSuites(@Query() query: QueryTestSuitesDto) {
    return await this.qaService.getTestSuites(query);
  }

  @Get('suites/:id')
  @Permissions('TESTING:READ')
  async getTestSuiteById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.qaService.getTestSuiteById(id);
  }

  @Patch('suites/:id')
  @Permissions('TESTING:MANAGE')
  async updateTestSuite(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTestSuiteDto,
    @Req() req: any,
  ) {
    return await this.qaService.updateTestSuite(id, dto, req.user.id);
  }

  @Delete('suites/:id')
  @Permissions('TESTING:MANAGE')
  async deleteTestSuite(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return await this.qaService.deleteTestSuite(id, req.user.id);
  }

  // ========================================================
  // Test Cases
  // ========================================================

  @Post('cases')
  @Permissions('TESTING:MANAGE')
  async createTestCase(@Body() dto: CreateTestCaseDto, @Req() req: any) {
    return await this.qaService.createTestCase(dto, req.user.id);
  }

  @Get('cases')
  @Permissions('TESTING:READ')
  async getTestCases(@Query() query: QueryTestCasesDto) {
    return await this.qaService.getTestCases(query);
  }

  @Get('cases/:id')
  @Permissions('TESTING:READ')
  async getTestCaseById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.qaService.getTestCaseById(id);
  }

  @Patch('cases/:id')
  @Permissions('TESTING:MANAGE')
  async updateTestCase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTestCaseDto,
    @Req() req: any,
  ) {
    return await this.qaService.updateTestCase(id, dto, req.user.id);
  }

  @Delete('cases/:id')
  @Permissions('TESTING:MANAGE')
  async deleteTestCase(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return await this.qaService.deleteTestCase(id, req.user.id);
  }

  // ========================================================
  // Test Runs
  // ========================================================

  @Post('runs')
  @Permissions('TESTING:EXECUTE')
  async createTestRun(@Body() dto: CreateTestRunDto, @Req() req: any) {
    return await this.qaService.createTestRun(dto, req.user.id);
  }

  @Get('runs')
  @Permissions('TESTING:READ')
  async getTestRuns(@Query() query: QueryTestRunsDto) {
    return await this.qaService.getTestRuns(query);
  }

  @Get('runs/:id')
  @Permissions('TESTING:READ')
  async getTestRunById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.qaService.getTestRunById(id);
  }

  @Patch('runs/:id')
  @Permissions('TESTING:EXECUTE')
  async updateTestRun(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTestRunDto,
    @Req() req: any,
  ) {
    return await this.qaService.updateTestRun(id, dto, req.user.id);
  }

  // ========================================================
  // Test Run Execution & Defect Logging
  // ========================================================

  @Patch('run-items/:id/execute')
  @Permissions('TESTING:EXECUTE')
  async executeTestRunItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExecuteTestRunItemDto,
    @Req() req: any,
  ) {
    return await this.qaService.executeTestRunItem(id, dto, req.user.id);
  }

  @Post('run-items/:id/log-defect')
  @Permissions('TESTING:EXECUTE')
  async logDefectFromRunItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LogDefectFromRunItemDto,
    @Req() req: any,
  ) {
    return await this.qaService.logDefectFromRunItem(id, dto, req.user.id);
  }

  // ========================================================
  // Release Readiness Checklists & Signoff
  // ========================================================

  @Post('release-checklists')
  @Permissions('TESTING:MANAGE')
  async createReleaseChecklist(
    @Body() dto: CreateReleaseChecklistDto,
    @Req() req: any,
  ) {
    return await this.qaService.createReleaseChecklist(dto, req.user.id);
  }

  @Get('release-checklists')
  @Permissions('TESTING:READ')
  async getReleaseChecklists(@Query() query: QueryReleaseChecklistsDto) {
    return await this.qaService.getReleaseChecklists(query);
  }

  @Get('release-checklists/:id')
  @Permissions('TESTING:READ')
  async getReleaseChecklistById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.qaService.getReleaseChecklistById(id);
  }

  @Patch('release-checklists/:checklistId/items/:itemId')
  @Permissions('TESTING:EXECUTE')
  async updateChecklistItem(
    @Param('checklistId', ParseUUIDPipe) checklistId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateChecklistItemDto,
    @Req() req: any,
  ) {
    return await this.qaService.updateChecklistItem(
      checklistId,
      itemId,
      dto,
      req.user.id,
    );
  }

  @Post('release-checklists/:id/signoff')
  @Permissions('TESTING:SIGNOFF')
  async signoffChecklist(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignoffChecklistDto,
    @Req() req: any,
  ) {
    return await this.qaService.signoffChecklist(id, dto, req.user.id);
  }

  // ========================================================
  // Traceability & Defect Radar Matrix
  // ========================================================

  @Get('traceability')
  @Permissions('TESTING:READ')
  async getTraceabilityMatrix(
    @Query('productId') productId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return await this.qaService.getTraceabilityMatrix(productId, projectId);
  }

  // ========================================================
  // QA Environments & Scoped Labels (QA-002)
  // ========================================================

  @Post('environments')
  @Permissions('QA_ENVIRONMENTS:MANAGE', 'TESTING:MANAGE')
  async createEnvironment(
    @Body() dto: CreateQaEnvironmentDto,
    @Req() req: any,
  ) {
    return await this.qaService.createEnvironment(dto, req.user.id);
  }

  @Get('environments')
  @Permissions('QA_ENVIRONMENTS:READ', 'TESTING:READ')
  async getEnvironments(@Query() query: QueryQaEnvironmentsDto) {
    return await this.qaService.getEnvironments(query);
  }

  @Get('environments/:id')
  @Permissions('QA_ENVIRONMENTS:READ', 'TESTING:READ')
  async getEnvironmentById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.qaService.getEnvironmentById(id);
  }

  @Patch('environments/:id')
  @Permissions('QA_ENVIRONMENTS:MANAGE', 'TESTING:MANAGE')
  async updateEnvironment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQaEnvironmentDto,
    @Req() req: any,
  ) {
    return await this.qaService.updateEnvironment(id, dto, req.user.id);
  }

  @Delete('environments/:id')
  @Permissions('QA_ENVIRONMENTS:MANAGE', 'TESTING:MANAGE')
  async deleteEnvironment(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return await this.qaService.deleteEnvironment(id, req.user.id);
  }

  // ========================================================
  // Issue Environment Observations & Retests (QA-002)
  // ========================================================

  @Post('observations')
  @Permissions('QA_OBSERVATIONS:RECORD', 'TESTING:EXECUTE')
  async createIssueObservation(
    @Body() dto: CreateIssueObservationDto,
    @Req() req: any,
  ) {
    return await this.qaService.createIssueObservation(dto, req.user);
  }

  @Get('observations')
  @Permissions('QA_OBSERVATIONS:READ', 'TESTING:READ')
  async getIssueObservations(
    @Query() query: QueryIssueObservationsDto,
    @Req() req: any,
  ) {
    return await this.qaService.getIssueObservations(query, req.user);
  }

  @Get('tasks/:taskId/environment-matrix')
  @Permissions('QA_OBSERVATIONS:READ', 'TESTING:READ')
  async getTaskEnvironmentMatrix(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Req() req: any,
  ) {
    return await this.qaService.getTaskEnvironmentMatrix(taskId, req.user);
  }
}
