import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsUUID } from '../../../common/validators/record-id';

export class CreateSprintDto {
  @ApiProperty({
    example: 'SPR-2026-01',
    description: 'Unique sprint code or sprint number identifier',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sprintCode: string;

  @ApiProperty({
    example: 'Sprint 1 - Core Foundations & Authentication',
    description: 'Display title for the sprint',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  sprintName: string;

  @ApiPropertyOptional({
    example: 'Deliver foundational user authentication, RBAC, and working calendar engine.',
    description: 'Strategic sprint goal',
  })
  @IsString()
  @IsOptional()
  sprintGoal?: string;

  @ApiProperty({
    example: 'PROJECT',
    enum: ['PROJECT', 'PRODUCT'],
    description: 'Whether sprint is scoped to a client project or a SaaS product',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['PROJECT', 'PRODUCT'])
  entityType: 'PROJECT' | 'PRODUCT';

  @ApiPropertyOptional({
    example: '99999999-9999-9999-9999-999999999991',
    description: 'Project UUID (required if entityType is PROJECT)',
  })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({
    example: '55555555-5555-5555-5555-555555555551',
    description: 'Product UUID (required if entityType is PRODUCT)',
  })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiProperty({
    example: '2026-10-01',
    description: 'Sprint starting date (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    example: '2026-10-14',
    description: 'Sprint end date (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}
