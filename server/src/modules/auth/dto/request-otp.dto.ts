import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({
    example: '+919999900000',
    description: 'Registered employee mobile number with country code (e.g. +91XXXXXXXXXX)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mobile number is required' })
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'Mobile number must be a valid E.164 phone format (e.g. +919999900000)',
  })
  mobileNumber: string;
}
