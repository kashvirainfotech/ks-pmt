import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsUUID } from '../../../common/validators/record-id';

export class AddSprintTasksDto {
  @ApiProperty({
    example: ['4a123bc4-56de-78fa-90bc-def123456789'],
    description: 'Array of Task UUIDs to pull into this sprint',
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsNotEmpty()
  taskIds: string[];

  @ApiPropertyOptional({
    example: 'Urgent customer defect requested during mid-sprint triage',
    description: 'Scope change justification (audit requirement PLAN-001)',
  })
  @IsString()
  @IsOptional()
  scopeChangeReason?: string;
}

export class RemoveSprintTaskDto {
  @ApiPropertyOptional({
    example: 'Deprioritized to next release milestone',
    description: 'Reason for ejecting task from active sprint',
  })
  @IsString()
  @IsOptional()
  scopeChangeReason?: string;
}
