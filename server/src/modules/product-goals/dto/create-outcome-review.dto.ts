import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OutcomeVerdict {
  MET_EXPECTATIONS = 'MET_EXPECTATIONS',
  EXCEEDED_EXPECTATIONS = 'EXCEEDED_EXPECTATIONS',
  BELOW_EXPECTATIONS = 'BELOW_EXPECTATIONS',
  INCONCLUSIVE = 'INCONCLUSIVE',
}

export class CreateOutcomeReviewDto {
  @ApiProperty({ description: 'Target software product ID' })
  @IsUUID()
  @IsNotEmpty()
  product_id: string;

  @ApiPropertyOptional({ description: 'Linked product goal ID' })
  @IsUUID()
  @IsOptional()
  goal_id?: string;

  @ApiPropertyOptional({ description: 'Linked released product version / release ID' })
  @IsUUID()
  @IsOptional()
  version_id?: string;

  @ApiPropertyOptional({ description: 'Linked original product idea ID (for discovery outcome closure)' })
  @IsUUID()
  @IsOptional()
  idea_id?: string;

  @ApiProperty({ description: 'Outcome review title', example: 'WhatsApp Conversational Flow 30-Day Post-Release Review' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  review_title: string;

  @ApiProperty({ description: 'Formal review date (YYYY-MM-DD)', example: '2026-09-28' })
  @IsDateString()
  @IsNotEmpty()
  review_date: string;

  @ApiPropertyOptional({ description: 'Conducting reviewer user ID' })
  @IsUUID()
  @IsOptional()
  reviewer_user_id?: string;

  @ApiPropertyOptional({ description: 'Actual observed metric value during evaluation', example: 83.5 })
  @IsNumber()
  @IsOptional()
  actual_metric_value?: number;

  @ApiProperty({
    enum: OutcomeVerdict,
    description: 'Post-release outcome evaluation verdict',
    example: OutcomeVerdict.EXCEEDED_EXPECTATIONS,
  })
  @IsEnum(OutcomeVerdict)
  @IsNotEmpty()
  outcome_verdict: OutcomeVerdict;

  @ApiPropertyOptional({ description: 'User adoption observations and telemetry measurements' })
  @IsString()
  @IsOptional()
  adoption_observations?: string;

  @ApiPropertyOptional({ description: 'Direct customer evidence, test cases, and metrics proof' })
  @IsString()
  @IsOptional()
  customer_evidence?: string;

  @ApiPropertyOptional({ description: 'Qualitative customer feedback and sentiments summary' })
  @IsString()
  @IsOptional()
  feedback_summary?: string;

  @ApiPropertyOptional({ description: 'Retrospective learnings, architecture takeaways, and next roadmap steps' })
  @IsString()
  @IsOptional()
  learnings_and_next_steps?: string;

  @ApiPropertyOptional({
    description: 'Reconciled approved allowance usage without double consumption',
    example: 150.0,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  reconciled_allowance_used?: number;
}
