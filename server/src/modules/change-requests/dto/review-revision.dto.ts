import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReviewRevisionDto {
  @IsNotEmpty()
  @IsIn(['AWAITING_CLIENT', 'CHANGES_REQUESTED', 'INTERNAL_REVIEW'])
  status: 'AWAITING_CLIENT' | 'CHANGES_REQUESTED' | 'INTERNAL_REVIEW';

  @IsOptional()
  @IsString()
  internalReviewNotes?: string;
}
