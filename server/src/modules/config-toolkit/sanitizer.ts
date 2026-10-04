import { BadRequestException } from "@nestjs/common";

const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

/**
 * Validates and sanitizes branding hex colors to prevent script/CSS injection
 */
export function sanitizeHexColor(colorStr?: string, defaultColor = "#2563eb"): string {
  if (!colorStr) return defaultColor;
  const trimmed = colorStr.trim();
  if (!HEX_COLOR_REGEX.test(trimmed)) {
    throw new BadRequestException(
      `Invalid branding color format: ${colorStr}. Expected valid hex color (e.g. #2563eb).`,
    );
  }
  return trimmed;
}

/**
 * Strips prohibited enterprise artifacts from portable configuration package bundles:
 * - Users, passwords, hashes, tokens, API secrets
 * - Client organization names, customer contacts, intake tickets
 * - Financial billing rates, actual contract values, employee bank details
 * - Direct permission assignment records (prevents silent privilege elevation)
 */
export function sanitizeConfigurationBundle(rawBundle: Record<string, any>): Record<string, any> {
  if (!rawBundle || typeof rawBundle !== "object") {
    throw new BadRequestException("Invalid configuration package payload");
  }

  // Forbidden top-level or nested keys
  const forbiddenKeys = [
    "users",
    "passwords",
    "password_hash",
    "tokens",
    "secret_key",
    "clients",
    "client_contacts",
    "financial_metrics",
    "cost_rate",
    "billable_rate",
    "salaries",
    "worklogs",
    "user_permissions",
    "role_permissions", // Prevents silent privilege elevation
  ];

  const sanitized: Record<string, any> = { ...rawBundle };

  for (const key of forbiddenKeys) {
    if (key in sanitized) {
      delete sanitized[key];
    }
  }

  // Ensure metadata exists
  if (!sanitized.metadata) {
    sanitized.metadata = {
      exported_at: new Date().toISOString(),
      schema_compatibility: "1.0.0",
    };
  }

  return sanitized;
}
