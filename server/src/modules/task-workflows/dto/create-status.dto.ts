import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateStatusDto {
  @ApiProperty({ example: 'UNDER_DEV', description: 'Unique status code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  statusCode: string;

  @ApiProperty({ example: 'Under Active Development', description: 'Display name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  statusName: string;

  @ApiPropertyOptional({ example: 'Developer is actively coding the task' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'IN_PROGRESS',
    enum: ['TODO', 'IN_PROGRESS', 'REVIEW_TEST', 'DONE', 'CANCELLED'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['TODO', 'IN_PROGRESS', 'REVIEW_TEST', 'DONE', 'CANCELLED'])
  statusCategory: string;

  @ApiPropertyOptional({ example: 25, default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  sequenceOrder?: number;

  @ApiPropertyOptional({ example: '#3B82F6' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  colorHex?: string;

  @ApiPropertyOptional({ example: false, default: false, description: 'True if this is an end/terminal status like Closed or Cancelled' })
  @IsBoolean()
  @IsOptional()
  isTerminal?: boolean;
}
