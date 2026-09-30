import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsEnum,
  IsBoolean,
} from 'class-validator';

export enum ActionPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class CreateClientActionRequestDto {
  @IsOptional()
  @IsUUID()
  raidItemId?: string;

  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsUUID()
  clientId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  contextForClient: string;

  @IsOptional()
  @IsEnum(ActionPriority)
  priority?: ActionPriority;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsUUID()
  assignedContactId?: string;

  @IsOptional()
  @IsBoolean()
  requiresApprover?: boolean;
}
