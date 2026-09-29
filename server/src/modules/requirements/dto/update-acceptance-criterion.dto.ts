import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateAcceptanceCriterionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['MANUAL_TEST', 'DEMO', 'DOCUMENTATION', 'AUTOMATED'])
  verificationMethod?: 'MANUAL_TEST' | 'DEMO' | 'DOCUMENTATION' | 'AUTOMATED';

  @IsOptional()
  @IsIn(['NOT_STARTED', 'IN_PROGRESS', 'IMPLEMENTED', 'VERIFIED_QA', 'ACCEPTED_CLIENT', 'WAIVED'])
  implementationStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'VERIFIED_QA' | 'ACCEPTED_CLIENT' | 'WAIVED';

  @IsOptional()
  @IsInt()
  orderIndex?: number;
}
