import { IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';

export class RegisterPushTokenDto {
  @IsNotEmpty()
  @IsIn(['ANDROID', 'IOS', 'WEB'])
  deviceType: 'ANDROID' | 'IOS' | 'WEB';

  @IsNotEmpty()
  @IsString()
  fcmToken: string;

  @IsOptional()
  @IsString()
  deviceModel?: string;

  @IsOptional()
  @IsString()
  osVersion?: string;
}

export class DeregisterPushTokenDto {
  @IsNotEmpty()
  @IsString()
  fcmToken: string;
}
