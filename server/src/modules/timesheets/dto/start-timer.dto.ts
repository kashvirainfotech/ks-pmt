import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartTimerDto {
  @ApiProperty({ description: 'Task UUID to track time against' })
  @IsUUID()
  @IsNotEmpty()
  taskId: string;

  @ApiPropertyOptional({ description: 'Whether tracked time is billable', default: true })
  @IsOptional()
  @IsBoolean()
  isBillable?: boolean;

  @ApiPropertyOptional({ description: 'Optional initial notes for the timer session' })
  @IsOptional()
  @IsString()
  notes?: string;
}
