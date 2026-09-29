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

export class CreateMilestoneDto {
  @ApiProperty({
    example: 'MLS-ALPHA',
    description: 'Unique milestone code within scope',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  milestoneCode: string;

  @ApiProperty({
    example: 'Alpha Feature Complete',
    description: 'Display title for the delivery milestone',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  milestoneName: string;

  @ApiPropertyOptional({
    example: 'All core data models, migrations, and backend APIs finalized and tested',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'PROJECT',
    enum: ['PROJECT', 'PRODUCT'],
    description: 'Scope of the milestone',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['PROJECT', 'PRODUCT'])
  entityType: 'PROJECT' | 'PRODUCT';

  @ApiPropertyOptional({ description: 'Project UUID' })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Product UUID' })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({
    example: '2026-10-31',
    description: 'Target delivery date (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsOptional()
  targetDate?: string;

  @ApiPropertyOptional({
    example: 'PLANNED',
    enum: ['PLANNED', 'IN_PROGRESS', 'ACHIEVED', 'MISSED', 'CANCELLED'],
    default: 'PLANNED',
  })
  @IsString()
  @IsOptional()
  @IsIn(['PLANNED', 'IN_PROGRESS', 'ACHIEVED', 'MISSED', 'CANCELLED'])
  status?: string = 'PLANNED';
}
