import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: '4a123bc4-56de-78fa-90bc-def123456789', description: 'Task UUID' })
  @IsUUID()
  @IsNotEmpty()
  taskId: string;

  @ApiPropertyOptional({ description: 'Parent Comment UUID if this is a reply to another comment' })
  @IsUUID()
  @IsOptional()
  parentCommentId?: string;

  @ApiProperty({
    example: 'Deployed fix to staging environment. @vikram please verify when ready.',
    description: 'Rich text comment message with @mentions',
  })
  @IsString()
  @IsNotEmpty()
  commentText: string;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Internal comment visible to internal team only',
  })
  @IsBoolean()
  @IsOptional()
  isInternalOnly?: boolean;
}
