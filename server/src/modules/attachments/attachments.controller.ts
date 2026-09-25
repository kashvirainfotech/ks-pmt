import { ParseUUIDPipe } from '../../common/validators/record-id';
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AttachmentsService } from './attachments.service';
import { RequestPresignedUploadDto } from './dto/request-presigned-upload.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';

@ApiTags('Attachments & Cloud Storage (AWS S3)')
@ApiBearerAuth('JWT-auth')
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('confirm-upload')
  async confirmUpload(
    @Body() dto: ConfirmUploadDto,
    @CurrentUser('id') userId: string,
  ) {
    return {
      data: await this.attachmentsService.confirmUpload(
        dto.attachmentId,
        userId,
      ),
    };
  }

  @Post('presigned-upload-url')
  @ApiOperation({
    summary: 'Generate AWS S3 Pre-signed PUT URL for direct client upload',
    description:
      'Enables mobile and web clients to upload files/photos directly to S3 without routing binary payloads through the application server.',
  })
  @ApiResponse({
    status: 201,
    description: 'Pre-signed URL generated successfully',
  })
  async generatePresignedUploadUrl(
    @Body() dto: RequestPresignedUploadDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.attachmentsService.generatePresignedUploadUrl(
      dto,
      userId,
    );
    return {
      message: 'Pre-signed upload URL generated successfully',
      data,
    };
  }

  @Get(':id/presigned-download-url')
  @ApiOperation({
    summary:
      'Generate secure AWS S3 Pre-signed GET URL for file viewing / download',
    description:
      'Returns time-limited private download link with inline content disposition.',
  })
  async generatePresignedDownloadUrl(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.attachmentsService.generatePresignedDownloadUrl(id);
    return {
      message: 'Download URL generated successfully',
      data,
    };
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({
    summary:
      'List all active attachments for an entity (TASK, PROJECT, PRODUCT, etc.)',
  })
  async findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ) {
    const data = await this.attachmentsService.findByEntity(
      entityType.toUpperCase(),
      entityId,
    );
    return {
      message: 'Attachments retrieved successfully',
      data,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete an attachment record' })
  async deleteAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.attachmentsService.deleteAttachment(id, userId);
    return {
      message: data.message,
      data: { success: data.success },
    };
  }
}
