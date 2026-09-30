import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum ActionDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  INFO_PROVIDED = 'INFO_PROVIDED',
  SCOPE_CHANGE_REQUESTED = 'SCOPE_CHANGE_REQUESTED',
}

export class RespondClientActionRequestDto {
  @IsString()
  @IsNotEmpty()
  responseText: string;

  @IsEnum(ActionDecision)
  resultingDecision: ActionDecision;

  @IsOptional()
  @IsUUID()
  resultingChangeRequestId?: string;
}
