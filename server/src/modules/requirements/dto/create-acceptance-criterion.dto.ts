import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAcceptanceCriterionDto {
  @IsOptional()
  @IsString()
  criteriaCode?: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsIn(['MANUAL_TEST', 'DEMO', 'DOCUMENTATION', 'AUTOMATED'])
  verificationMethod?: 'MANUAL_TEST' | 'DEMO' | 'DOCUMENTATION' | 'AUTOMATED';

  @IsOptional()
  @IsInt()
  orderIndex?: number;
}
