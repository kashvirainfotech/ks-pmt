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
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { CreateAcceptanceCriterionDto } from './dto/create-acceptance-criterion.dto';
import { UpdateAcceptanceCriterionDto } from './dto/update-acceptance-criterion.dto';
import { BaselineRequirementDto } from './dto/baseline-requirement.dto';
import { LinkCriterionTasksDto } from './dto/link-criterion-tasks.dto';
import { QaVerifyCriterionDto } from './dto/qa-verify-criterion.dto';
import { QueryRequirementsDto } from './dto/query-requirements.dto';
import { RequirementsService } from './requirements.service';

@Controller('requirements')
@UseGuards(JwtAuthGuard, DynamicRbacGuard)
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Post()
  @Permissions('REQUIREMENTS:MANAGE')
  async createRequirement(@Body() dto: CreateRequirementDto, @Req() req: any) {
    return await this.requirementsService.createRequirement(dto, req.user.id);
  }

  @Get()
  @Permissions('REQUIREMENTS:READ')
  async getRequirements(@Query() query: QueryRequirementsDto) {
    return await this.requirementsService.getRequirements(query);
  }

  @Get('traceability/matrix')
  @Permissions('REQUIREMENTS:READ')
  async getTraceabilityMatrix(
    @Query('projectId') projectId?: string,
    @Query('productId') productId?: string,
  ) {
    return await this.requirementsService.getTraceabilityMatrix({ projectId, productId });
  }

  @Get(':id')
  @Permissions('REQUIREMENTS:READ')
  async getRequirementById(@Param('id') id: string) {
    return await this.requirementsService.getRequirementById(id);
  }

  @Patch(':id')
  @Permissions('REQUIREMENTS:MANAGE')
  async updateRequirement(
    @Param('id') id: string,
    @Body() dto: UpdateRequirementDto,
    @Req() req: any,
  ) {
    return await this.requirementsService.updateRequirement(id, dto, req.user.id);
  }

  @Post(':id/baseline')
  @Permissions('REQUIREMENTS:MANAGE')
  async baselineRequirement(
    @Param('id') id: string,
    @Body() dto: BaselineRequirementDto,
    @Req() req: any,
  ) {
    return await this.requirementsService.baselineRequirement(id, dto, req.user.id);
  }

  @Post(':id/propose-amendment')
  @Permissions('REQUIREMENTS:MANAGE')
  async proposeAmendment(@Param('id') id: string, @Req() req: any) {
    return await this.requirementsService.proposeAmendment(id, req.user.id);
  }

  @Post(':id/criteria')
  @Permissions('REQUIREMENTS:MANAGE')
  async addCriterion(
    @Param('id') id: string,
    @Body() dto: CreateAcceptanceCriterionDto,
    @Req() req: any,
  ) {
    return await this.requirementsService.addCriterion(id, dto, req.user.id);
  }

  @Patch('criteria/:criterionId')
  @Permissions('REQUIREMENTS:MANAGE')
  async updateCriterion(
    @Param('criterionId') criterionId: string,
    @Body() dto: UpdateAcceptanceCriterionDto,
    @Req() req: any,
  ) {
    return await this.requirementsService.updateCriterion(criterionId, dto, req.user.id);
  }

  @Delete('criteria/:criterionId')
  @Permissions('REQUIREMENTS:MANAGE')
  async deleteCriterion(@Param('criterionId') criterionId: string) {
    return await this.requirementsService.deleteCriterion(criterionId);
  }

  @Post('criteria/:criterionId/tasks')
  @Permissions('REQUIREMENTS:MANAGE')
  async linkTasksToCriterion(
    @Param('criterionId') criterionId: string,
    @Body() dto: LinkCriterionTasksDto,
    @Req() req: any,
  ) {
    return await this.requirementsService.linkTasksToCriterion(criterionId, dto, req.user.id);
  }

  @Delete('criteria/:criterionId/tasks/:taskId')
  @Permissions('REQUIREMENTS:MANAGE')
  async unlinkTaskFromCriterion(
    @Param('criterionId') criterionId: string,
    @Param('taskId') taskId: string,
  ) {
    return await this.requirementsService.unlinkTaskFromCriterion(criterionId, taskId);
  }

  @Post('criteria/:criterionId/qa-verify')
  @Permissions('REQUIREMENTS:SIGNOFF')
  async recordQaVerification(
    @Param('criterionId') criterionId: string,
    @Body() dto: QaVerifyCriterionDto,
    @Req() req: any,
  ) {
    return await this.requirementsService.recordQaVerification(criterionId, dto, req.user.id);
  }
}
