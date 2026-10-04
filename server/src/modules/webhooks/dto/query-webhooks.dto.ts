import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBooleanString, IsOptional, IsString } from "class-validator";
import { IsUUID } from "../../../common/validators/record-id";

export class QuerySubscriptionsDto {
  @ApiPropertyOptional()
  @IsBooleanString()
  @IsOptional()
  isEnabled?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  eventType?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  projectId?: string;
}

export class QueryDeliveriesDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  subscriptionId?: string;

  @ApiPropertyOptional({
    description: "Filter by status: PENDING, SUCCESS, FAILED, RETRYING, CANCELLED, MANUAL_REPLAY",
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  eventType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  eventId?: string;
}

export class SimulateEventDto {
  @ApiPropertyOptional({
    example: "task.created",
    description: "Event type to simulate",
  })
  @IsString()
  @IsOptional()
  eventType?: string;

  @ApiPropertyOptional({
    example: "w1000000-0000-0000-0000-000000000001",
    description: "Target subscription UUID to send test ping to",
  })
  @IsUUID()
  @IsOptional()
  subscriptionId?: string;
}
