import { IsUUID } from "../../../common/validators/record-id";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsInt, Min } from "class-validator";

export class ChangeTaskStatusDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedRevision?: number;
  @ApiProperty({
    example: "66666666-6666-6666-6666-666666666662",
    description: "Target Task Status UUID to transition to",
  })
  @IsUUID()
  @IsNotEmpty()
  toStatusId: string;

  @ApiPropertyOptional({
    example: "Code review approved by Tech Lead; deploying to QA environment",
  })
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiPropertyOptional({
    enum: ["FIXED", "WONT_FIX", "DUPLICATE", "CANNOT_REPRODUCE", "BY_DESIGN"],
    description: "Resolution classification when transitioning to a closed status",
  })
  @IsString()
  @IsOptional()
  resolution?: string;

  @ApiPropertyOptional({
    description: "Explanation or resolution rationale",
  })
  @IsString()
  @IsOptional()
  resolutionDetails?: string;
}

