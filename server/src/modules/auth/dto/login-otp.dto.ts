import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

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

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP received via SMS',
  })
  @IsString()
  @IsNotEmpty({ message: 'OTP is required' })
  @Length(6, 6, { message: 'OTP must be exactly 6 numeric digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain numbers only' })
  otp: string;
}
