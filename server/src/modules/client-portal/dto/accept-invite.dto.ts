import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class AcceptInviteDto {
  @ApiProperty({ description: 'Invitation token received via email/admin' })
  @IsString()
  @IsNotEmpty()
  invitationToken: string;

  @ApiProperty({ description: 'New portal password (min 8 characters)', minLength: 8 })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ example: '+1-555-0199' })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class ClientLoginDto {
  @ApiProperty({ example: 'john.doe@acme.com' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'MySecurePassword123!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class UpdateContactDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @ApiPropertyOptional({ enum: ['CLIENT_USER', 'CLIENT_ADMIN'] })
  @IsEnum(['CLIENT_USER', 'CLIENT_ADMIN'] as any)
  @IsOptional()
  portalRole?: 'CLIENT_USER' | 'CLIENT_ADMIN';

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isApprover?: boolean;

  @ApiPropertyOptional({ enum: ['INVITED', 'ACTIVE', 'REVOKED', 'EXPIRED'] })
  @IsEnum(['INVITED', 'ACTIVE', 'REVOKED', 'EXPIRED'] as any)
  @IsOptional()
  status?: 'INVITED' | 'ACTIVE' | 'REVOKED' | 'EXPIRED';
}
