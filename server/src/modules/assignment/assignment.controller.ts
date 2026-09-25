import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AssignmentService } from './assignment.service';
import { CreateAssignmentRuleDto } from './dto/create-assignment-rule.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Auto-Assignment Matrix')
@ApiBearerAuth('JWT-auth')
@Controller('auto-assignment')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post('rules')
  @RequirePermissions('TASKS:ASSIGN')
  @ApiOperation({ summary: 'Create an automatic task assignment matrix rule' })
  @ApiResponse({ status: 201, description: 'Rule created successfully' })
  async createRule(
    @Body() dto: CreateAssignmentRuleDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.assignmentService.createRule(dto, userId);
    return {
      message: 'Auto-assignment rule created successfully',
      data,
    };
  }

  @Get('rules')
  @ApiOperation({ summary: 'List all configured auto-assignment rules' })
  async findAllRules() {
    const data = await this.assignmentService.findAllRules();
    return {
      message: 'Auto-assignment rules retrieved successfully',
      data,
    };
  }

  @Delete('rules/:id')
  @RequirePermissions('TASKS:ASSIGN')
  @ApiOperation({ summary: 'Deactivate an auto-assignment rule' })
  async deleteRule(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.assignmentService.deleteRule(id);
    return {
      message: data.message,
      data: { success: data.success },
    };
  }
}
