import { IsUUID } from '../../../common/validators/record-id';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PermissionOverrideDto {
  @ApiProperty({
    example: '88888888-8888-8888-8888-888888888888',
    description: 'Permission UUID to override',
  })
  @IsUUID()
  @IsNotEmpty()
  permissionId: string;

  @ApiProperty({
    example: true,
    description:
      'TRUE = explicitly grant permission to this user; FALSE = explicitly revoke',
  })
  @IsBoolean()
  @IsNotEmpty()
  isGranted: boolean;

  @ApiPropertyOptional({
    example: 'Approved by VP of Engineering for Project Phoenix billing audit',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
