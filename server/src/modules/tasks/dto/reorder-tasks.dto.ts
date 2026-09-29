import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { IsUUID } from '../../../common/validators/record-id';

export class TaskOrderItem {
  @ApiProperty({ description: 'Task UUID' })
  @IsUUID()
  @IsNotEmpty()
  taskId: string;

  @ApiProperty({ description: 'New fractional or integer rank order' })
  @IsNumber()
  @IsNotEmpty()
  backlogOrder: number;
}

export class ReorderTasksDto {
  @ApiProperty({
    type: [TaskOrderItem],
    description: 'Array of task ID and rank order pairs',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskOrderItem)
  items: TaskOrderItem[];
}
