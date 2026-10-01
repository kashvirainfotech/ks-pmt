import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export enum TaskTemplatePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TaskTemplateHierarchyLevel {
  EPIC = 'EPIC',
  TASK = 'TASK',
  SUBTASK = 'SUBTASK',
}

export class ChecklistTemplateItemDto {
  @IsString()
  @IsNotEmpty()
  item: string;

  @IsBoolean()
  @IsOptional()
  is_required?: boolean;
}

export class CreateTaskTemplateDto {
  @IsUUID()
  @IsOptional()
  projectTemplateId?: string;

  @IsString()
  @IsOptional()
  taskTemplateCode?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  taskTypeId?: string;

  @IsEnum(TaskTemplatePriority)
  @IsOptional()
  priority?: TaskTemplatePriority;

  @IsEnum(TaskTemplateHierarchyLevel)
  @IsOptional()
  hierarchyLevel?: TaskTemplateHierarchyLevel;

  @IsUUID()
  @IsOptional()
  parentTaskTemplateId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  startOffsetDays?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  durationDays?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedHours?: number;

  @IsString()
  @IsOptional()
  defaultRoleCode?: string;

  @IsArray()
  @IsOptional()
  checklistsTemplate?: ChecklistTemplateItemDto[];

  @IsInt()
  @IsOptional()
  displayOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateTaskTemplateDto {
  @IsUUID()
  @IsOptional()
  projectTemplateId?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  taskTypeId?: string;

  @IsEnum(TaskTemplatePriority)
  @IsOptional()
  priority?: TaskTemplatePriority;

  @IsEnum(TaskTemplateHierarchyLevel)
  @IsOptional()
  hierarchyLevel?: TaskTemplateHierarchyLevel;

  @IsUUID()
  @IsOptional()
  parentTaskTemplateId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  startOffsetDays?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  durationDays?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedHours?: number;

  @IsString()
  @IsOptional()
  defaultRoleCode?: string;

  @IsArray()
  @IsOptional()
  checklistsTemplate?: ChecklistTemplateItemDto[];

  @IsInt()
  @IsOptional()
  displayOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
