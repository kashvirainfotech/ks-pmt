import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from "class-validator";
import { IsUUID } from "../../../common/validators/record-id";

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({
    example: "Updated Webhook Name",
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: "https://api.external.com/v1/webhook",
  })
  @IsUrl({ require_tld: false })
  @IsOptional()
  targetUrl?: string;

  @ApiPropertyOptional({
    isArray: true,
    example: ["task.created", "sla.breached"],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  eventTypes?: string[];

  @ApiPropertyOptional({
    isArray: true,
  })
  @IsArray()
  @IsOptional()
  @IsUUID('all', { each: true })
  scopeProjectIds?: string[];

  @ApiPropertyOptional({
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    example: 3,
  })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  maxRetries?: number;

  @ApiPropertyOptional({
    example: 10,
  })
  @IsInt()
  @Min(1)
  @Max(60)
  @IsOptional()
  timeoutSeconds?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}
