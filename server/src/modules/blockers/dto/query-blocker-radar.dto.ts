import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";
import { IsUUID } from "../../../common/validators/record-id";
import { BLOCKER_CATEGORIES, BLOCKER_PRIORITIES, BlockerCategory, BlockerPriority } from "./create-blocker.dto";

export class QueryBlockerRadarDto {
  @ApiPropertyOptional({ description: "Filter by Project UUID" })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: "Filter by Product UUID" })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ description: "Filter by Agile Sprint UUID" })
  @IsUUID()
  @IsOptional()
  sprintId?: string;

  @ApiPropertyOptional({ enum: BLOCKER_CATEGORIES })
  @IsString()
  @IsOptional()
  @IsIn(BLOCKER_CATEGORIES)
  category?: BlockerCategory;

  @ApiPropertyOptional({ enum: BLOCKER_PRIORITIES })
  @IsString()
  @IsOptional()
  @IsIn(BLOCKER_PRIORITIES)
  priority?: BlockerPriority;

  @ApiPropertyOptional({ description: "Minimum blocker age in days to filter aging blockers" })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  minAgeDays?: number;
}
