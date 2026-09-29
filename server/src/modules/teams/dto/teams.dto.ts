import { IsString, IsNotEmpty, IsOptional, IsUUID, IsArray, IsNumber, Min, Max, IsIn } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  teamCode: string;

  @IsString()
  @IsNotEmpty()
  teamName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  leadUserId?: string;

  @IsArray()
  @IsOptional()
  projectIds?: string[];

  @IsArray()
  @IsOptional()
  productIds?: string[];
}

export class UpdateTeamDto {
  @IsString()
  @IsOptional()
  teamName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  leadUserId?: string;

  @IsArray()
  @IsOptional()
  projectIds?: string[];

  @IsArray()
  @IsOptional()
  productIds?: string[];
}

export class AddTeamMemberDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  roleInTeam?: string;

  @IsString()
  @IsOptional()
  joinedDate?: string;

  @IsString()
  @IsOptional()
  leftDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  allocationPercentage?: number;
}

export class CreateComponentDto {
  @IsString()
  @IsNotEmpty()
  componentCode: string;

  @IsString()
  @IsNotEmpty()
  componentName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['PRODUCT', 'PROJECT'])
  entityType: 'PRODUCT' | 'PROJECT';

  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsUUID()
  @IsOptional()
  ownerTeamId?: string;

  @IsUUID()
  @IsOptional()
  techLeadUserId?: string;

  @IsString()
  @IsOptional()
  technologyStack?: string;

  @IsString()
  @IsOptional()
  documentationUrl?: string;

  @IsString()
  @IsOptional()
  repositoryUrl?: string;

  @IsString()
  @IsOptional()
  @IsIn(['TIER_1_CRITICAL', 'TIER_2_CORE', 'TIER_3_SUPPORTING'])
  criticality?: 'TIER_1_CRITICAL' | 'TIER_2_CORE' | 'TIER_3_SUPPORTING';
}

export class UpdateComponentDto {
  @IsString()
  @IsOptional()
  componentName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  ownerTeamId?: string;

  @IsUUID()
  @IsOptional()
  techLeadUserId?: string;

  @IsString()
  @IsOptional()
  technologyStack?: string;

  @IsString()
  @IsOptional()
  documentationUrl?: string;

  @IsString()
  @IsOptional()
  repositoryUrl?: string;

  @IsString()
  @IsOptional()
  @IsIn(['TIER_1_CRITICAL', 'TIER_2_CORE', 'TIER_3_SUPPORTING'])
  criticality?: 'TIER_1_CRITICAL' | 'TIER_2_CORE' | 'TIER_3_SUPPORTING';
}

export class CreateComponentDependencyDto {
  @IsUUID()
  @IsNotEmpty()
  dependsOnComponentId: string;

  @IsString()
  @IsOptional()
  @IsIn(['CONSUMES_API', 'CALLS_SERVICE', 'SHARED_DATABASE', 'EVENT_PUBSUB', 'CLIENT_SDK'])
  dependencyType?: 'CONSUMES_API' | 'CALLS_SERVICE' | 'SHARED_DATABASE' | 'EVENT_PUBSUB' | 'CLIENT_SDK';

  @IsString()
  @IsOptional()
  description?: string;
}

export class LinkTaskComponentsDto {
  @IsArray()
  componentIds: string[];

  @IsUUID()
  @IsOptional()
  primaryComponentId?: string;
}
