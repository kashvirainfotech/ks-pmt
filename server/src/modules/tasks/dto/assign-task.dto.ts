import { IsUUID } from "../../../common/validators/record-id";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsNotEmpty, IsOptional, IsInt, Min } from "class-validator";

export class AssignTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedRevision?: number;
  @ApiProperty({
    example: [
      "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "f9e8d7c6-b5a4-3210-fedc-ba9876543210",
    ],
    description: "Array of employee UUIDs to assign to this task",
  })
  @IsArray()
  @IsUUID("all", { each: true })
  @IsNotEmpty()
  assigneeIds: string[];

  @ApiPropertyOptional({
    example: "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
    description: "Primary accountable assignee UUID",
  })
  @IsUUID()
  @IsOptional()
  primaryAssigneeId?: string;
}
