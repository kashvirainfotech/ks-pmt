import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum ProjectTemplateCategory {
  CLIENT_ONBOARDING = 'CLIENT_ONBOARDING',
  FIXED_PRICE_DELIVERY = 'FIXED_PRICE_DELIVERY',
  MAINTENANCE_RETAINER = 'MAINTENANCE_RETAINER',
  SECURITY_AUDIT = 'SECURITY_AUDIT',
  RELEASE_CHECKLIST = 'RELEASE_CHECKLIST',
  INTERNAL_INITIATIVE = 'INTERNAL_INITIATIVE',
  CUSTOM = 'CUSTOM',
}

export class MilestoneTemplateItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  target_offset_days?: number;

  @IsInt()
  @IsOptional()
  display_order?: number;
}

export class CreateProjectTemplateDto {
  @IsString()
  @IsOptional()
  templateCode?: string;

  @IsString()
  @IsNotEmpty()
  templateName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProjectTemplateCategory)
  @IsOptional()
  category?: ProjectTemplateCategory;

  @IsString()
  @IsOptional()
  targetEngagementModel?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  defaultEstimatedDurationDays?: number;

  @IsArray()
  @IsOptional()
  milestoneTemplates?: MilestoneTemplateItemDto[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateProjectTemplateDto {
  @IsString()
  @IsOptional()
  templateName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProjectTemplateCategory)
  @IsOptional()
  category?: ProjectTemplateCategory;

  @IsString()
  @IsOptional()
  targetEngagementModel?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  defaultEstimatedDurationDays?: number;

  @IsArray()
  @IsOptional()
  milestoneTemplates?: MilestoneTemplateItemDto[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
