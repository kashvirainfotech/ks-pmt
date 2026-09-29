import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewTimesheetPortionDto {
  @ApiProperty({ description: 'Approval decision', enum: ['APPROVED', 'REJECTED'] })
  @IsNotEmpty()
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ description: 'Review remarks or rejection explanation' })
  @IsOptional()
  @IsString()
  reviewRemarks?: string;

  @ApiPropertyOptional({ description: 'Optimistic revision check number' })
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedRevision?: number;
}
