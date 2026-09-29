import { IsBoolean, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateRequirementDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  moduleName?: string;

  @IsOptional()
  @IsString()
  businessObjective?: string;

  @IsOptional()
  @IsString()
  inScope?: string;

  @IsOptional()
  @IsString()
  outOfScope?: string;

  @IsOptional()
  @IsString()
  assumptions?: string;

  @IsOptional()
  @IsUUID()
  originatingRequestId?: string;

  @IsOptional()
  @IsBoolean()
  isClientVisible?: boolean;

  @IsOptional()
  @IsIn(['DRAFT', 'PROPOSED', 'REVIEWED', 'BASELINED', 'AMENDED', 'ARCHIVED'])
  status?: 'DRAFT' | 'PROPOSED' | 'REVIEWED' | 'BASELINED' | 'AMENDED' | 'ARCHIVED';
}
