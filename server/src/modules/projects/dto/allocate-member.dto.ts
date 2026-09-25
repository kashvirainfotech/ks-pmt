import { IsUUID } from '../../../common/validators/record-id';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AllocateMemberDto {
  @ApiProperty({
    example: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
    description: 'Employee User UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    example: 'Tech Lead / Principal Backend Dev',
    description: 'Role on this specific project',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  projectRole: string;

  @ApiPropertyOptional({
    example: 100.0,
    default: 100.0,
    description: 'Capacity allocation percentage',
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  allocationPercentage?: number;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2027-01-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
