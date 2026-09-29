import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ClientSignoffDto {
  @IsNotEmpty()
  @IsIn(['ACCEPTED', 'REJECTED', 'WAIVED'])
  signoffStatus: 'ACCEPTED' | 'REJECTED' | 'WAIVED';

  @IsOptional()
  @IsString()
  notes?: string;
}
