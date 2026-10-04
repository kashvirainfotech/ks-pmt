import { IsOptional, IsUUID, IsEnum, IsString, IsInt, Min, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { QaEnvironmentType, QaScopeType } from './create-qa-environment.dto';
import { IssueObservationType } from './create-issue-observation.dto';

export class QueryQaEnvironmentsDto {
  @IsEnum(QaEnvironmentType)
  @IsOptional()
  env_type?: QaEnvironmentType;

  @IsEnum(QaScopeType)
  @IsOptional()
  scope_type?: QaScopeType;

  @IsUUID()
  @IsOptional()
  product_id?: string;

  @IsUUID()
  @IsOptional()
  project_id?: string;

  @IsUUID()
  @IsOptional()
  client_id?: string;

  @IsString()
  @IsOptional()
  search?: string;
}

export class QueryIssueObservationsDto {
  @IsUUID()
  @IsOptional()
  task_id?: string;

  @IsUUID()
  @IsOptional()
  environment_id?: string;

  @IsUUID()
  @IsOptional()
  version_id?: string;

  @IsEnum(IssueObservationType)
  @IsOptional()
  observation_type?: IssueObservationType;

  @IsUUID()
  @IsOptional()
  product_id?: string;

  @IsUUID()
  @IsOptional()
  project_id?: string;

  @IsUUID()
  @IsOptional()
  client_id?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  is_client_visible?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 50;
}
