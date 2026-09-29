import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateSprintDto } from './create-sprint.dto';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateSprintDto extends PartialType(CreateSprintDto) {
  @ApiPropertyOptional({
    example: 'ACTIVE',
    enum: ['PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED'])
  status?: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}
