import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ChangeTaskStatusDto {
  @ApiProperty({
    example: '66666666-6666-6666-6666-666666666662',
    description: 'Target Task Status UUID to transition to',
  })
  @IsUUID()
  @IsNotEmpty()
  toStatusId: string;

  @ApiPropertyOptional({ example: 'Code review approved by Tech Lead; deploying to QA environment' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
