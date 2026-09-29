import { IsOptional, IsString } from 'class-validator';

export class AcknowledgeHandoffDto {
  @IsString()
  @IsOptional()
  notes?: string;
}

export class StartHandoffWorkDto {
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReturnHandoffDto {
  @IsString()
  @IsOptional()
  reason: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class RedirectHandoffDto {
  @IsString()
  @IsOptional()
  toTeamId?: string;

  @IsString()
  @IsOptional()
  toUserId?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CompleteHandoffDto {
  @IsString()
  @IsOptional()
  notes?: string;
}

export class QueryHandoffsDto {
  @IsString()
  @IsOptional()
  taskId?: string;

  @IsString()
  @IsOptional()
  teamId?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  handoffType?: string;

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  limit?: string;
}
