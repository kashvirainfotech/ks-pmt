import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from "class-validator";
import { IsUUID } from "../../../common/validators/record-id";

export const ALLOWED_WEBHOOK_EVENTS = [
  "task.created",
  "task.transitioned",
  "task.assigned",
  "blocker.opened",
  "blocker.resolved",
  "release.published",
  "sla.breached",
  "cr.approved",
  "uat.accepted",
  "milestone.completed",
] as const;

export type WebhookEventType = (typeof ALLOWED_WEBHOOK_EVENTS)[number];

export class CreateSubscriptionDto {
  @ApiProperty({
    example: "WH-SLACK-DELIVERY",
    description: "Unique subscription code identifier",
  })
  @IsString()
  @IsNotEmpty()
  subscriptionCode: string;

  @ApiProperty({
    example: "Slack Delivery Bot Alerts",
    description: "Descriptive name for the webhook integration",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
    description: "Target destination URL (must be public HTTPS/HTTP, no private/internal IPs)",
  })
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  targetUrl: string;

  @ApiProperty({
    enum: ALLOWED_WEBHOOK_EVENTS,
    isArray: true,
    example: ["task.created", "sla.breached", "blocker.opened"],
    description: "Allowlisted event types to subscribe to",
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  eventTypes: string[];

  @ApiPropertyOptional({
    description: "Optional project UUIDs to scope event triggering (empty means all projects)",
    isArray: true,
    example: ["00000000-0000-0000-0000-000000000001"],
  })
  @IsArray()
  @IsOptional()
  @IsUUID('all', { each: true })
  scopeProjectIds?: string[];

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: "Whether the subscription is actively receiving event dispatches",
  })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    example: 3,
    default: 3,
    description: "Maximum automated delivery retry attempts (1 to 10)",
  })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  maxRetries?: number;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    description: "Request timeout in seconds (1 to 60)",
  })
  @IsInt()
  @Min(1)
  @Max(60)
  @IsOptional()
  timeoutSeconds?: number;

  @ApiPropertyOptional({
    example: "Notifies team in Slack whenever high priority blockers or SLA breaches occur",
  })
  @IsString()
  @IsOptional()
  description?: string;
}
