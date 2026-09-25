import { IsUUID } from '../../../common/validators/record-id';
import { IsString, IsNotEmpty } from 'class-validator';
export class ConfirmUploadDto {
  @IsUUID() attachmentId: string;
}
