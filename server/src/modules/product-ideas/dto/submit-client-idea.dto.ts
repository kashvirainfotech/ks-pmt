import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SubmitClientIdeaDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  customerProblem: string;

  @IsOptional()
  @IsString()
  expectedOutcome?: string;
}
