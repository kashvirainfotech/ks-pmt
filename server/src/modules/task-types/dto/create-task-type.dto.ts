import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTaskTypeDto {
  @ApiProperty({ example: 'NEW_DEV', description: 'Unique task type code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  typeCode: string;

  @ApiProperty({ example: 'New Development', description: 'Display name of task type' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  typeName: string;

  @ApiPropertyOptional({ example: 'Brand new feature or module development task' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '#3B82F6', description: 'Hex color badge code' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  colorHex?: string;

  @ApiPropertyOptional({ example: 'code', description: 'Lucide icon identifier' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  iconName?: string;

  @ApiPropertyOptional({ example: false, default: false, description: 'Whether tasks of this type are chargeable to client by default' })
  @IsBoolean()
  @IsOptional()
  isChargeableDefault?: boolean;
}
