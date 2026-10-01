import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SaveActivityQueryDto {
  @IsNotEmpty()
  @IsString()
  queryName: string;

  @IsNotEmpty()
  @IsString()
  timeFilterType: string;

  @IsOptional()
  @IsUUID()
  baselineId?: string;

  @IsOptional()
  @IsString()
  scopeType?: string;

  @IsOptional()
  @IsUUID()
  scopeId?: string;

  @IsOptional()
  @IsBoolean()
  isClientSafe?: boolean;

  @IsOptional()
  @IsArray()
  categoryFilters?: string[];
}
