import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class QaVerifyCriterionDto {
  @IsOptional()
  @IsIn(['MANUAL_TEST', 'DEMO', 'DOCUMENTATION', 'AUTOMATED'])
  verificationMethod?: 'MANUAL_TEST' | 'DEMO' | 'DOCUMENTATION' | 'AUTOMATED';

  @IsOptional()
  @IsString()
  evidenceNotes?: string;

  @IsOptional()
  @IsArray()
  evidenceUrls?: Array<{ title?: string; url: string; uploadedAt?: string }>;

  @IsOptional()
  @IsIn(['VERIFIED_QA', 'IMPLEMENTED', 'WAIVED'])
  status?: 'VERIFIED_QA' | 'IMPLEMENTED' | 'WAIVED';
}
