import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ClientUatDecisionDto {
  @IsNotEmpty()
  @IsIn(['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'])
  decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsUUID()
  contactId?: string;
}
