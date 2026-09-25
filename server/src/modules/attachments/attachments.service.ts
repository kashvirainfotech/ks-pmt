import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { RequestPresignedUploadDto } from './dto/request-presigned-upload.dto';

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly presignedUrlExpires: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly db: DatabaseService,
  ) {
    this.region = this.configService.get<string>('AWS_REGION', 'ap-south-1');
    this.bucketName = this.configService.get<string>(
      'AWS_S3_BUCKET_NAME',
      'ks-pmt-attachments-prod',
    );
    this.presignedUrlExpires = this.configService.get<number>(
      'AWS_S3_PRESIGNED_URL_EXPIRES',
      900,
    );

    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    this.s3Client = new S3Client({
      region: this.region,
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined, // Uses IAM role if running on EC2/ECS/EKS
    });
  }

  /**
   * Generates AWS S3 pre-signed upload URL (PUT) for direct client-to-S3 upload
   */
  async generatePresignedUploadUrl(
    dto: RequestPresignedUploadDto,
    userId: string,
  ) {
    if (dto.fileSizeBytes > 100 * 1024 * 1024)
      throw new BadRequestException('Files cannot exceed 100 MB');
    const sanitizedFileName = dto.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileId = crypto.randomUUID();
    const s3ObjectKey = `${dto.entityType.toLowerCase()}s/${dto.entityId}/${fileId}-${sanitizedFileName}`;

    // 1. Generate S3 Pre-signed PUT URL
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3ObjectKey,
      ContentType: dto.mimeType,
      ContentLength: dto.fileSizeBytes,
      Metadata: {
        'uploaded-by': userId,
        'entity-type': dto.entityType,
        'entity-id': dto.entityId,
      },
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: this.presignedUrlExpires,
    });

    // 2. Persist metadata in PostgreSQL attachments table
    const insertQuery = `
      INSERT INTO attachments (
        entity_type, entity_id, original_file_name, mime_type,
        file_size_bytes, s3_bucket_name, s3_object_key, s3_region,
        description, is_active, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, $10, $10
      )
      RETURNING *;
    `;

    const result = await this.db.query(insertQuery, [
      dto.entityType,
      dto.entityId,
      dto.fileName,
      dto.mimeType,
      dto.fileSizeBytes,
      this.bucketName,
      s3ObjectKey,
      this.region,
      dto.description || null,
      userId,
    ]);

    const attachment = result.rows[0];

    return {
      attachmentId: attachment.id,
      uploadUrl,
      s3Key: s3ObjectKey,
      expiresInSeconds: this.presignedUrlExpires,
      attachment,
    };
  }

  async confirmUpload(id: string, userId: string) {
    const result = await this.db.query(
      'SELECT * FROM attachments WHERE id=$1 AND created_by=$2',
      [id, userId],
    );
    if (!result.rowCount)
      throw new NotFoundException('Upload request not found');
    const attachment = result.rows[0];
    const object = await this.s3Client.send(
      new HeadObjectCommand({
        Bucket: attachment.s3_bucket_name,
        Key: attachment.s3_object_key,
      }),
    );
    if (
      Number(object.ContentLength) !== Number(attachment.file_size_bytes) ||
      object.ContentType !== attachment.mime_type
    )
      throw new BadRequestException(
        'Uploaded file does not match the requested size or content type',
      );
    return this.db.transaction(async (client) => {
      const confirmed = await client.query(
        'UPDATE attachments SET is_active=TRUE, updated_by=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *',
        [id, userId],
      );
      if (attachment.entity_type === 'USER_AVATAR') {
        if (attachment.entity_id !== userId)
          throw new BadRequestException('You may only update your own avatar');
        await client.query(
          'UPDATE users SET avatar_s3_key=$1, updated_by=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$2',
          [attachment.s3_object_key, userId],
        );
      }
      return confirmed.rows[0];
    });
  }

  /**
   * Generates AWS S3 pre-signed download URL (GET) for secure file viewing
   */
  async generatePresignedDownloadUrl(id: string) {
    const query = `SELECT * FROM attachments WHERE id = $1 AND is_active = TRUE;`;
    const result = await this.db.query(query, [id]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Attachment with ID ${id} not found.`);
    }

    const attachment = result.rows[0];

    const command = new GetObjectCommand({
      Bucket: attachment.s3_bucket_name,
      Key: attachment.s3_object_key,
      ResponseContentDisposition: `inline; filename="${attachment.original_file_name}"`,
    });

    const downloadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: this.presignedUrlExpires,
    });

    return {
      attachmentId: attachment.id,
      downloadUrl,
      fileName: attachment.original_file_name,
      mimeType: attachment.mime_type,
      fileSizeBytes: attachment.file_size_bytes,
      expiresInSeconds: this.presignedUrlExpires,
    };
  }

  /**
   * List all active attachments for a specific entity (Task, Project, etc.)
   */
  async findByEntity(entityType: string, entityId: string) {
    const query = `
      SELECT 
        a.id, a.entity_type, a.entity_id, a.original_file_name,
        a.mime_type, a.file_size_bytes, a.s3_object_key, a.description,
        a.created_at,
        CONCAT(u.first_name, ' ', u.last_name) AS uploaded_by_name,
        u.avatar_s3_key AS uploader_avatar
      FROM attachments a
      INNER JOIN users u ON a.created_by = u.id
      WHERE a.entity_type = $1 AND a.entity_id = $2 AND a.is_active = TRUE
      ORDER BY a.created_at DESC;
    `;
    const result = await this.db.query(query, [entityType, entityId]);
    return result.rows;
  }

  /**
   * Soft delete attachment
   */
  async deleteAttachment(id: string, userId: string) {
    const query = `
      UPDATE attachments SET
        is_active = FALSE,
        updated_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `;
    const result = await this.db.query(query, [userId, id]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Attachment with ID ${id} not found.`);
    }
    return { success: true, message: 'Attachment removed' };
  }
}
