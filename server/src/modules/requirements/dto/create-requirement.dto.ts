import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRequirementDto {
  @IsOptional()
  @IsString()
  reqCode?: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsString()
  moduleName?: string;

  @IsNotEmpty()
  @IsString()
  businessObjective: string;

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
}
