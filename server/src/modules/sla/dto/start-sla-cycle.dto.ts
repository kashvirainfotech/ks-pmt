import { IsString, IsOptional } from 'class-validator';

export class StartSlaCycleDto {
  @IsString()
  @IsOptional()
  taskId?: string;

  @IsString()
  @IsOptional()
  clientRequestId?: string;

  @IsString()
  @IsOptional()
  policyId?: string;
}
