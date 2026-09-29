import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReviewUatRevisionDto {
  @IsNotEmpty()
  @IsIn(['READY_FOR_CLIENT', 'CHANGES_REQUESTED', 'INTERNAL_QA'])
  status: 'READY_FOR_CLIENT' | 'CHANGES_REQUESTED' | 'INTERNAL_QA';

  @IsOptional()
  @IsString()
  qaNotes?: string;
}
