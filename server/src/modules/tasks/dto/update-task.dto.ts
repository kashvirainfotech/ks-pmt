import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { CreateTaskDto } from "./create-task.dto";
import { IsDateString, IsOptional, IsInt, Min } from "class-validator";

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiPropertyOptional({
    description: "Revision read by the editor; stale edits return HTTP 409",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedRevision?: number;
  @ApiPropertyOptional({ example: "2026-10-01T10:30:00Z" })
  @IsDateString()
  @IsOptional()
  actualStartDate?: string;

  @ApiPropertyOptional({ example: "2026-10-04T17:45:00Z" })
  @IsDateString()
  @IsOptional()
  actualEndDate?: string;
}
