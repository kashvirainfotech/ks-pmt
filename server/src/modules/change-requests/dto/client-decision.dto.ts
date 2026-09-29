import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ClientDecisionDto {
  @IsNotEmpty()
  @IsIn(['APPROVED', 'CHANGES_REQUESTED', 'REJECTED', 'DEFERRED', 'WITHDRAWN'])
  decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED' | 'DEFERRED' | 'WITHDRAWN';

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsUUID()
  contactId?: string;
}
