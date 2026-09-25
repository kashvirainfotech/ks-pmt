import { IsUUID } from '../../../common/validators/record-id';
import {
  IsObject as ExtraObject,
  IsNumber as ExtraNumber,
  Min as ExtraMin,
  IsIn as ExtraIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({
    example: 'Implement Stripe Webhook Handler',
    description: 'Task title',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    example:
      'Handle customer.subscription.updated and invoice.payment_failed events',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: '55555555-5555-5555-5555-555555555551',
    description: 'Dynamic Task Type UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  taskTypeId: string;

  @ApiPropertyOptional({
    example: 'MEDIUM',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'],
    default: 'MEDIUM',
  })
  @IsString()
  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'])
  priority?: string;

  @ApiPropertyOptional({
    example: '99999999-9999-9999-9999-999999999991',
    description: 'Project UUID (if project task)',
  })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({
    example: '55555555-5555-5555-5555-555555555551',
    description: 'Product UUID (if product task)',
  })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ description: 'Version / Release Milestone UUID' })
  @IsUUID()
  @IsOptional()
  versionId?: string;

  @ApiPropertyOptional({
    description: 'Parent Task UUID (if this is a subtask)',
  })
  @IsUUID()
  @IsOptional()
  parentTaskId?: string;

  @ApiPropertyOptional({ example: '2026-10-01T09:00:00Z' })
  @IsDateString()
  @IsOptional()
  plannedStartDate?: string;

  @ApiPropertyOptional({ example: '2026-10-05T18:00:00Z' })
  @IsDateString()
  @IsOptional()
  plannedEndDate?: string;

  @ApiPropertyOptional({
    example: 16.0,
    default: 0.0,
    description: 'Estimated effort in hours',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedHours?: number;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Whether this task is chargeable to the client',
  })
  @IsBoolean()
  @IsOptional()
  isChargeable?: boolean;

  @ApiPropertyOptional({
    example: 600.0,
    default: 0.0,
    description: 'Amount charged for this task if chargeable',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  chargeAmount?: number;

  @ApiPropertyOptional({ example: 'INR', default: 'INR' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ description: 'Branch UUID' })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({
    example: ['c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c'],
    description: 'Array of employee UUIDs assigned to this task',
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  assigneeIds?: string[];

  @ApiPropertyOptional({ description: 'Primary assignee user UUID' })
  @IsUUID()
  @IsOptional()
  primaryAssigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  severity?: string;
}
