import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export enum KnowledgeCategory {
  SPECIFICATION = 'SPECIFICATION',
  ARCHITECTURE_DECISION = 'ARCHITECTURE_DECISION',
  RUNBOOK = 'RUNBOOK',
  MEETING_NOTES = 'MEETING_NOTES',
  RELEASE_NOTES = 'RELEASE_NOTES',
  USER_GUIDE = 'USER_GUIDE',
  POLICY = 'POLICY',
}

export enum KnowledgeEntityType {
  GLOBAL = 'GLOBAL',
  PRODUCT = 'PRODUCT',
  PROJECT = 'PROJECT',
}

export enum KnowledgeAudience {
  INTERNAL_ONLY = 'INTERNAL_ONLY',
  CLIENT_VISIBLE = 'CLIENT_VISIBLE',
  PRODUCT_COMMUNITY = 'PRODUCT_COMMUNITY',
}

export enum KnowledgeDocStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  SUPERSEDED = 'SUPERSEDED',
  ARCHIVED = 'ARCHIVED',
}

export enum DecisionOutcome {
  PROPOSED = 'PROPOSED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  DEPRECATED = 'DEPRECATED',
  SUPERSEDED = 'SUPERSEDED',
}

export class CreateKnowledgeDocDto {
  @IsOptional()
  @IsString()
  documentCode?: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsEnum(KnowledgeCategory)
  category: KnowledgeCategory;

  @IsOptional()
  @IsEnum(KnowledgeEntityType)
  entityType?: KnowledgeEntityType = KnowledgeEntityType.GLOBAL;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  componentId?: string;

  @IsOptional()
  @IsEnum(KnowledgeAudience)
  audience?: KnowledgeAudience = KnowledgeAudience.INTERNAL_ONLY;

  @IsOptional()
  @IsEnum(KnowledgeDocStatus)
  status?: KnowledgeDocStatus = KnowledgeDocStatus.DRAFT;

  @IsOptional()
  @IsEnum(DecisionOutcome)
  decisionOutcome?: DecisionOutcome;

  @IsOptional()
  @IsUUID()
  supersededByDocumentId?: string;

  @IsOptional()
  @IsUUID()
  ownerUserId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsNotEmpty()
  @IsString()
  contentMarkdown: string;

  @IsOptional()
  @IsString()
  changeSummary?: string;
}

export class UpdateKnowledgeDocDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(KnowledgeCategory)
  category?: KnowledgeCategory;

  @IsOptional()
  @IsEnum(KnowledgeAudience)
  audience?: KnowledgeAudience;

  @IsOptional()
  @IsEnum(KnowledgeDocStatus)
  status?: KnowledgeDocStatus;

  @IsOptional()
  @IsEnum(DecisionOutcome)
  decisionOutcome?: DecisionOutcome;

  @IsOptional()
  @IsUUID()
  supersededByDocumentId?: string;

  @IsOptional()
  @IsUUID()
  ownerUserId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
