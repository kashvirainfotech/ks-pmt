import { IsUUID } from '../../../common/validators/record-id';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
export class CreateSubtaskDto {
  @IsString() @IsNotEmpty() @MaxLength(255) title: string;
  @IsOptional() @IsUUID() assignedToUserId?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}
export class ToggleSubtaskDto {
  @IsBoolean() isCompleted: boolean;
}
