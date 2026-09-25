import { IsUUID } from '../../../common/validators/record-id';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAssignmentRuleDto {
  @ApiProperty({
    example: 'Auto-assign bugs to QA Lead',
    description: 'Descriptive rule name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  ruleName: string;

  @ApiProperty({
    example: 'ON_CREATION',
    enum: ['ON_CREATION', 'ON_STATUS_CHANGE'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['ON_CREATION', 'ON_STATUS_CHANGE'])
  triggerEvent: string;

  @ApiPropertyOptional({
    example: '55555555-5555-5555-5555-555555555552',
    description: 'Task Type UUID',
  })
  @IsUUID()
  @IsOptional()
  taskTypeId?: string;

  @ApiPropertyOptional({
    description:
      'Origin status UUID (required if triggerEvent is ON_STATUS_CHANGE)',
  })
  @IsUUID()
  @IsOptional()
  fromStatusId?: string;

  @ApiPropertyOptional({
    description:
      'Target destination status UUID (required if triggerEvent is ON_STATUS_CHANGE)',
  })
  @IsUUID()
  @IsOptional()
  toStatusId?: string;

  @ApiPropertyOptional({ description: 'Optional Branch UUID restriction' })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiProperty({
    example: 'DEPARTMENT_HOD',
    enum: [
      'SPECIFIC_USER',
      'DEPARTMENT_HOD',
      'DESIGNATION_HIERARCHY',
      'PROJECT_MANAGER',
      'ROUND_ROBIN',
    ],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn([
    'SPECIFIC_USER',
    'DEPARTMENT_HOD',
    'DESIGNATION_HIERARCHY',
    'PROJECT_MANAGER',
    'ROUND_ROBIN',
  ])
  targetAssignmentType: string;

  @ApiPropertyOptional({
    description:
      'Target Department UUID (required for DEPARTMENT_HOD, DESIGNATION_HIERARCHY, ROUND_ROBIN)',
  })
  @IsUUID()
  @IsOptional()
  targetDepartmentId?: string;

  @ApiPropertyOptional({
    description: 'Target Designation UUID (required for DESIGNATION_HIERARCHY)',
  })
  @IsUUID()
  @IsOptional()
  targetDesignationId?: string;

  @ApiPropertyOptional({
    description: 'Specific User UUID (required for SPECIFIC_USER)',
  })
  @IsUUID()
  @IsOptional()
  targetUserId?: string;
}
