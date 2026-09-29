import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateMilestoneDto } from './create-milestone.dto';
import { IsBoolean, IsDateString, IsOptional } from 'class-validator';

export class UpdateMilestoneDto extends PartialType(CreateMilestoneDto) {
  @ApiPropertyOptional({ example: '2026-10-28', description: 'Actual date achieved' })
  @IsDateString()
  @IsOptional()
  actualDate?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
