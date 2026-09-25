import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class LoginOtpDto {
  @ApiProperty({
    example: '+919999900000',
    description: 'Registered employee mobile number with country code',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mobile number is required' })
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'Mobile number must be a valid E.164 phone format',
  })
  mobileNumber: string;

  @ApiPropertyOptional({
    example: '123456',
    description: '6-digit OTP received via SMS',
  })
  @IsString()
  @IsOptional()
  otp?: string;

  @ApiPropertyOptional({
    example: '123456',
    description: '6-digit OTP received via SMS (alias for otp)',
  })
  @IsString()
  @IsOptional()
  otpCode?: string;

  @ApiPropertyOptional({
    example: 'WEB',
    description: 'Client device platform (WEB, ANDROID, IOS)',
  })
  @IsString()
  @IsOptional()
  devicePlatform?: string;
}

