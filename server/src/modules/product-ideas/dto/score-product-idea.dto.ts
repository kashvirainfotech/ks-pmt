import { IsInt, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class ScoreProductIdeaDto {
  @IsInt()
  @Min(0)
  reach: number;

  @IsNumber()
  @Min(0.1)
  @Max(10)
  impactScore: number;

  @IsNumber()
  @Min(0.1)
  @Max(1.0)
  confidenceScore: number;

  @IsNumber()
  @Min(0.1)
  @Max(20)
  effortScore: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  strategicFit?: number;

  @IsOptional()
  @IsString()
  scoringRationale?: string;
}
