import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import { IsUUID } from "../../../common/validators/record-id";
import { TASK_LINK_TYPES, TaskLinkType } from "./create-dependency.dto";

export class QueryDependencyDto {
  @ApiPropertyOptional({ description: "Filter links where task is either source or target" })
  @IsUUID()
  @IsOptional()
  taskId?: string;

  @ApiPropertyOptional({ enum: TASK_LINK_TYPES })
  @IsString()
  @IsOptional()
  @IsIn(TASK_LINK_TYPES)
  linkType?: TaskLinkType;
}
