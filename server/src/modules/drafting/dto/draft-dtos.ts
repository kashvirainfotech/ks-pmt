import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum DraftType {
  DRAFT_SUBTASKS = "DRAFT_SUBTASKS",
  DRAFT_ACCEPTANCE_CRITERIA = "DRAFT_ACCEPTANCE_CRITERIA",
  DRAFT_RELEASE_NOTES = "DRAFT_RELEASE_NOTES",
  DRAFT_SPRINT_SUMMARY = "DRAFT_SPRINT_SUMMARY",
  DRAFT_BUG_TRIAGE = "DRAFT_BUG_TRIAGE",
  GAP_SUGGESTION = "GAP_SUGGESTION",
  DUPLICATE_SUGGESTION = "DUPLICATE_SUGGESTION",
}

export enum DraftStatus {
  PENDING_REVIEW = "PENDING_REVIEW",
  ACCEPTED = "ACCEPTED",
  MODIFIED_AND_ACCEPTED = "MODIFIED_AND_ACCEPTED",
  REJECTED = "REJECTED",
  DISCARDED = "DISCARDED",
}

export enum AudienceScope {
  INTERNAL_ONLY = "INTERNAL_ONLY",
  CLIENT_SAFE = "CLIENT_SAFE",
  PUBLIC_COMMUNITY = "PUBLIC_COMMUNITY",
}

export class GenerateDraftDto {
  @ApiProperty({
    example: "SUBTASKS",
    enum: ["SUBTASKS", "ACCEPTANCE_CRITERIA", "RELEASE_NOTES", "GAP_AUDIT", "DUPLICATE_CHECK"],
  })
  @IsString()
  @IsNotEmpty()
  generatorType: "SUBTASKS" | "ACCEPTANCE_CRITERIA" | "RELEASE_NOTES" | "GAP_AUDIT" | "DUPLICATE_CHECK";

  @ApiProperty({ example: "20000000-0000-0000-0000-0000000003e9" })
  @IsUUID("all")
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({ example: "TASK", enum: ["TASK", "REQUIREMENT", "VERSION", "SPRINT", "PROJECT"] })
  @IsString()
  @IsNotEmpty()
  entityType: "TASK" | "REQUIREMENT" | "VERSION" | "SPRINT" | "PROJECT";

  @ApiPropertyOptional({ example: "INTERNAL_ONLY", enum: AudienceScope })
  @IsEnum(AudienceScope)
  @IsOptional()
  audienceScope?: AudienceScope;
}

export class ReviewDraftDto {
  @ApiProperty({ example: "ACCEPTED", enum: DraftStatus })
  @IsEnum(DraftStatus)
  @IsNotEmpty()
  status: DraftStatus;

  @ApiPropertyOptional({ example: "Verified work breakdown with tech lead." })
  @IsString()
  @IsOptional()
  reviewNotes?: string;

  @ApiPropertyOptional({ description: "Human-modified content if status is MODIFIED_AND_ACCEPTED" })
  @IsObject()
  @IsOptional()
  reviewedContent?: Record<string, any>;

  @ApiPropertyOptional({
    example: true,
    description: "If true, automatically instantiates accepted subtasks or criteria into live entities",
  })
  @IsBoolean()
  @IsOptional()
  applyToSource?: boolean;
}

export class QueryDraftsDto {
  @ApiPropertyOptional({ enum: DraftType })
  @IsEnum(DraftType)
  @IsOptional()
  draftType?: DraftType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sourceEntityType?: string;

  @ApiPropertyOptional()
  @IsUUID("all")
  @IsOptional()
  sourceEntityId?: string;

  @ApiPropertyOptional({ enum: DraftStatus })
  @IsEnum(DraftStatus)
  @IsOptional()
  status?: DraftStatus;

  @ApiPropertyOptional({ enum: AudienceScope })
  @IsEnum(AudienceScope)
  @IsOptional()
  audienceScope?: AudienceScope;
}

export class UpdateRuleConfigDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({ example: 0.75 })
  @IsNumber()
  @Min(0.1)
  @Max(1.0)
  @IsOptional()
  similarityThreshold?: number;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  ruleParameters?: Record<string, any>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}
