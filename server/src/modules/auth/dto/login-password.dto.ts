import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginPasswordDto {
  @ApiProperty({
    example: 'admin@kashvirainfotech.com',
    description: 'Registered employee official email address',
  })
  @IsEmail({}, { message: 'Please provide a valid official email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    example: 'Admin@123456',
    description: 'Account password',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiPropertyOptional({
    example: 'WEB',
    description: 'Client device platform (WEB, ANDROID, IOS)',
  })
  @IsString()
  @IsOptional()
  devicePlatform?: string;
}

