import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDesignationDto {
  @ApiProperty({ example: 'DESIG-SR-FE', description: 'Unique designation code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  desigCode: string;

  @ApiProperty({ example: 'Senior Frontend Engineer', description: 'Designation title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  desigName: string;

  @ApiProperty({ example: '22222222-2222-2222-2222-222222222221', description: 'Associated Department UUID' })
  @IsUUID()
  @IsNotEmpty()
  departmentId: string;

  @ApiProperty({ example: 6, description: 'Seniority hierarchy level (1-20), used for auto-routing and escalation' })
  @IsInt()
  @Min(1)
  @Max(20)
  hierarchyLevel: number;

  @ApiPropertyOptional({ example: 'Lead frontend architect and mentor' })
  @IsString()
  @IsOptional()
  description?: string;
}
