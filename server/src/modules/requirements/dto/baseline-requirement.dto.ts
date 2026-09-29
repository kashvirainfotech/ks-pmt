import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class BaselineRequirementDto {
  @IsNotEmpty()
  @IsString()
  baselineName: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
