import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { IsUUID } from '../../../common/validators/record-id';

export class StartSprintDto {
  @ApiPropertyOptional({
    example: 'Finalized backlog items for sprint commitment snapshot',
    description: 'Optional kickoff remarks',
  })
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class CloseSprintDto {
  @ApiPropertyOptional({
    example: '77777777-7777-7777-7777-777777777771',
    description: 'Target Sprint UUID to automatically rollover incomplete tasks',
  })
  @IsUUID()
  @IsOptional()
  targetSprintId?: string;

  @ApiPropertyOptional({
    example: 'Deferred due to client API dependency block',
    description: 'Scope change reason recorded for rolled-over tasks',
  })
  @IsString()
  @IsOptional()
  rolloverReason?: string;
}
