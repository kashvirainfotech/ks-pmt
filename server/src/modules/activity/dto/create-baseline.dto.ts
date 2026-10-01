import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateBaselineDto {
  @IsNotEmpty()
  @IsString()
  baselineCode: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsString()
  scopeType: 'PROJECT' | 'PRODUCT' | 'SPRINT' | 'RELEASE';

  @IsNotEmpty()
  @IsUUID()
  scopeId: string;
}
