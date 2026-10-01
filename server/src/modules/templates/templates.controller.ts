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
import { DynamicRbacGuard } from '../rbac/rbac.guard';
import { Permissions } from '../rbac/rbac.decorator';
import { ParseUUIDPipe } from '../../common/validators/record-id';
import { TemplatesService } from './templates.service';
import {
  CreateProjectTemplateDto,
  UpdateProjectTemplateDto,
} from './dto/create-project-template.dto';
import {
  CreateTaskTemplateDto,
  UpdateTaskTemplateDto,
} from './dto/create-task-template.dto';
import {
  CreateRecurrenceRuleDto,
  TriggerRecurrenceRuleDto,
  UpdateRecurrenceRuleDto,
} from './dto/create-recurrence-rule.dto';
import {
  InstantiateProjectTemplateDto,
  InstantiateTaskTemplateDto,
} from './dto/instantiate-template.dto';
import {
  QueryProjectTemplatesDto,
  QueryRecurrenceRulesDto,
  QueryTaskTemplatesDto,
} from './dto/query-templates.dto';

@Controller('templates')
@UseGuards(JwtAuthGuard, DynamicRbacGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  // ========================================================
  // 1. Project Templates Master
  // ========================================================

  @Post('projects')
  @Permissions('TEMPLATES:MANAGE')
  async createProjectTemplate(
    @Body() dto: CreateProjectTemplateDto,
    @Req() req: any,
  ) {
    return await this.templatesService.createProjectTemplate(dto, req.user.id);
  }

  @Get('projects')
  @Permissions('TEMPLATES:READ')
  async getProjectTemplates(@Query() query: QueryProjectTemplatesDto) {
    return await this.templatesService.getProjectTemplates(query);
  }

  @Get('projects/:id')
  @Permissions('TEMPLATES:READ')
  async getProjectTemplateById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.templatesService.getProjectTemplateById(id);
  }

  @Patch('projects/:id')
  @Permissions('TEMPLATES:MANAGE')
  async updateProjectTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectTemplateDto,
    @Req() req: any,
  ) {
    return await this.templatesService.updateProjectTemplate(id, dto, req.user.id);
  }

  @Delete('projects/:id')
  @Permissions('TEMPLATES:MANAGE')
  async deleteProjectTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return await this.templatesService.deleteProjectTemplate(id);
  }

  @Post('projects/:id/instantiate')
  @Permissions('TEMPLATES:INSTANTIATE')
  async instantiateProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InstantiateProjectTemplateDto,
    @Req() req: any,
  ) {
    return await this.templatesService.instantiateProject(id, dto, req.user.id);
  }

  // ========================================================
  // 2. Task Templates Library
  // ========================================================

  @Post('tasks')
  @Permissions('TEMPLATES:MANAGE')
  async createTaskTemplate(
    @Body() dto: CreateTaskTemplateDto,
    @Req() req: any,
  ) {
    return await this.templatesService.createTaskTemplate(dto, req.user.id);
  }

  @Get('tasks')
  @Permissions('TEMPLATES:READ')
  async getTaskTemplates(@Query() query: QueryTaskTemplatesDto) {
    return await this.templatesService.getTaskTemplates(query);
  }

  @Get('tasks/:id')
  @Permissions('TEMPLATES:READ')
  async getTaskTemplateById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.templatesService.getTaskTemplateById(id);
  }

  @Patch('tasks/:id')
  @Permissions('TEMPLATES:MANAGE')
  async updateTaskTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskTemplateDto,
    @Req() req: any,
  ) {
    return await this.templatesService.updateTaskTemplate(id, dto, req.user.id);
  }

  @Delete('tasks/:id')
  @Permissions('TEMPLATES:MANAGE')
  async deleteTaskTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return await this.templatesService.deleteTaskTaskTemplate(id);
  }

  @Post('tasks/:id/instantiate')
  @Permissions('TEMPLATES:INSTANTIATE')
  async instantiateTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InstantiateTaskTemplateDto,
    @Req() req: any,
  ) {
    return await this.templatesService.instantiateTask(id, dto, req.user.id);
  }

  // ========================================================
  // 3. Recurring Work Rules & Deduplication Registry
  // ========================================================

  @Post('recurrence-rules')
  @Permissions('RECURRENCE:MANAGE')
  async createRecurrenceRule(
    @Body() dto: CreateRecurrenceRuleDto,
    @Req() req: any,
  ) {
    return await this.templatesService.createRecurrenceRule(dto, req.user.id);
  }

  @Get('recurrence-rules')
  @Permissions('TEMPLATES:READ')
  async getRecurrenceRules(@Query() query: QueryRecurrenceRulesDto) {
    return await this.templatesService.getRecurrenceRules(query);
  }

  @Get('recurrence-rules/:id')
  @Permissions('TEMPLATES:READ')
  async getRecurrenceRuleById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.templatesService.getRecurrenceRuleById(id);
  }

  @Patch('recurrence-rules/:id')
  @Permissions('RECURRENCE:MANAGE')
  async updateRecurrenceRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecurrenceRuleDto,
    @Req() req: any,
  ) {
    return await this.templatesService.updateRecurrenceRule(id, dto, req.user.id);
  }

  @Delete('recurrence-rules/:id')
  @Permissions('RECURRENCE:MANAGE')
  async deleteRecurrenceRule(@Param('id', ParseUUIDPipe) id: string) {
    return await this.templatesService.deleteRecurrenceRule(id);
  }

  @Get('recurrence-rules/:id/occurrences')
  @Permissions('TEMPLATES:READ')
  async getRuleOccurrences(@Param('id', ParseUUIDPipe) id: string) {
    return await this.templatesService.getRuleOccurrences(id);
  }

  @Post('recurrence-rules/:id/trigger')
  @Permissions('RECURRENCE:MANAGE')
  async triggerRecurrenceRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TriggerRecurrenceRuleDto,
    @Req() req: any,
  ) {
    return await this.templatesService.triggerRecurrenceRule(
      id,
      dto.targetDate,
      req.user.id,
    );
  }
}
