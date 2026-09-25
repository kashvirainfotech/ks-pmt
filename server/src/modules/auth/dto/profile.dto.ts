import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
export class NotificationPreferencesDto {
  @IsBoolean() inApp: boolean;
  @IsBoolean() email: boolean;
  @IsBoolean() push: boolean;
}
export class ChangePasswordDto {
  @IsString() @IsNotEmpty() currentPassword: string;
  @IsString()
  @MinLength(10)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
  newPassword: string;
}
