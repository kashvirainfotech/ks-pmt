import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export enum KnowledgeLinkedEntityType {
  TASK = 'TASK',
  VERSION = 'VERSION',
  MILESTONE = 'MILESTONE',
  REQUIREMENT_CRITERION = 'REQUIREMENT_CRITERION',
  CHANGE_REQUEST = 'CHANGE_REQUEST',
}

export class LinkKnowledgeEntityDto {
  @IsNotEmpty()
  @IsEnum(KnowledgeLinkedEntityType)
  linkedEntityType: KnowledgeLinkedEntityType;

  @IsNotEmpty()
  @IsUUID()
  linkedEntityId: string;

  @IsOptional()
  @IsString()
  linkNotes?: string;
}
