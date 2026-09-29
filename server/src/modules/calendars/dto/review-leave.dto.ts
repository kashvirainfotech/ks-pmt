import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReviewLeaveDto {
  @ApiProperty({
    example: 'APPROVED',
    enum: ['APPROVED', 'REJECTED', 'CANCELLED'],
    description: 'Decision status for the leave request',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['APPROVED', 'REJECTED', 'CANCELLED'])
  status: 'APPROVED' | 'REJECTED' | 'CANCELLED';

  @ApiPropertyOptional({
    example: 'Approved as per company standard PTO policy',
    description: 'Approver or reviewer remarks',
  })
  @IsString()
  @IsOptional()
  remarks?: string;
}
