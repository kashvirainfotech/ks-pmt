import { IsArray, ValidateNested, IsUUID, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AssigneeEffortShareDto {
  @IsUUID()
  userId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  effortSharePercentage: number;
}

export class SplitCoAssigneeEffortDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssigneeEffortShareDto)
  shares: AssigneeEffortShareDto[];
}
