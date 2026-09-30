import { IsOptional, IsUUID, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { RaidCategory, RaidLikelihood, RaidImpact } from './create-raid-item.dto';

export class QueryRaidDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsEnum(RaidCategory)
  category?: RaidCategory;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsEnum(RaidLikelihood)
  likelihood?: RaidLikelihood;

  @IsOptional()
  @IsEnum(RaidImpact)
  impact?: RaidImpact;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isClientShared?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}

export class QueryClientActionDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  priority?: string;
}
