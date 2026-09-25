import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateWorkflowTransitionDto {
  @ApiProperty({
    example: '55555555-5555-5555-5555-555555555551',
    description: 'Task Type UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  taskTypeId: string;

  @ApiProperty({
    example: '66666666-6666-6666-6666-666666666661',
    description: 'Source Status UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  fromStatusId: string;

  @ApiProperty({
    example: '66666666-6666-6666-6666-666666666662',
    description: 'Destination / Target Status UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  toStatusId: string;
}
