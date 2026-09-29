import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProjectGrantItemDto {
  @ApiProperty({ description: 'Project ID to grant access to' })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  canViewMilestones?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  canCreateRequests?: boolean = true;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  canApproveScope?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  canApproveUat?: boolean = false;
}

export class InviteContactDto {
  @ApiProperty({ description: 'Client organization ID' })
  @IsUUID()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'john.doe@acme.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: '+1-555-0199' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Director of Technology' })
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @ApiPropertyOptional({
    enum: ['CLIENT_USER', 'CLIENT_ADMIN'],
    default: 'CLIENT_USER',
  })
  @IsEnum(['CLIENT_USER', 'CLIENT_ADMIN'])
  @IsOptional()
  portalRole?: 'CLIENT_USER' | 'CLIENT_ADMIN' = 'CLIENT_USER';

  @ApiPropertyOptional({
    description: 'Grant client approver capabilities for scope & UAT',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isApprover?: boolean = false;

  @ApiPropertyOptional({
    description: 'Initial project access grants for this contact',
    type: [ProjectGrantItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectGrantItemDto)
  @IsOptional()
  projectGrants?: ProjectGrantItemDto[];
}
