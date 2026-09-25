import { IsUUID } from '../../../common/validators/record-id';
import {
  IsObject as ExtraObject,
  IsNumber as ExtraNumber,
  Min as ExtraMin,
  IsIn as ExtraIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'EMP-1025', description: 'Unique employee code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  employeeCode: string;

  @ApiProperty({ example: 'Siddharth', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Patel', description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({
    example: 'siddharth.patel@kashvirainfotech.com',
    description: 'Official corporate email',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: '+919876543210',
    description: 'Mobile number with country code',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'Mobile number must be a valid E.164 phone format',
  })
  mobileNumber: string;

  @ApiPropertyOptional({
    example: 'SecurePassword@2026',
    description: 'Initial account password (optional if strictly OTP)',
  })
  @IsString()
  @IsOptional()
  @MinLength(10)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message: 'Password must include uppercase, lowercase, number and symbol',
  })
  password?: string;

  @ApiProperty({
    example: '11111111-1111-1111-1111-111111111111',
    description: 'Primary branch UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  primaryBranchId: string;

  @ApiPropertyOptional({
    example: ['11111111-1111-1111-1111-111111111112'],
    description: 'Array of additional branch UUIDs employee has access to',
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  secondaryBranchIds?: string[];

  @ApiProperty({
    example: '22222222-2222-2222-2222-222222222221',
    description: 'Department UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  departmentId: string;

  @ApiProperty({
    example: '33333333-3333-3333-3333-333333333333',
    description: 'Designation UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  designationId: string;

  @ApiProperty({
    example: '44444444-4444-4444-4444-444444444444',
    description: 'Base Role UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  roleId: string;

  @ApiPropertyOptional({
    example: '00000000-0000-0000-0000-000000000001',
    description: 'Reporting Manager User UUID',
  })
  @IsUUID()
  @IsOptional()
  reportingManagerId?: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Allow Email + Password login',
  })
  @IsBoolean()
  @IsOptional()
  isEmailLoginAllowed?: boolean;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Allow Mobile + OTP login',
  })
  @IsBoolean()
  @IsOptional()
  isOtpLoginAllowed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ExtraIn(['ACTIVE', 'INACTIVE', 'SUSPENDED'])
  employmentStatus?: string;
}
