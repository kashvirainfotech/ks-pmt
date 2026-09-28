import { BadRequestException } from "@nestjs/common";
import { RECORD_ID } from "../../common/validators/record-id";

export interface CustomTaskField {
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "boolean"
    | "date"
    | "select"
    | "multiselect"
    | "user";
  required?: boolean;
  default?: unknown;
  options?: string[];
  order?: number;
}
const types = [
  "text",
  "textarea",
  "number",
  "boolean",
  "date",
  "select",
  "multiselect",
  "user",
];
export function customDefinitions(
  schema: Record<string, any> = {},
): Record<string, CustomTaskField> {
  if (!schema || Array.isArray(schema) || typeof schema !== "object")
    throw new BadRequestException("Custom field definitions must be an object");
  const result: Record<string, CustomTaskField> = Object.create(null);
  for (const [key, raw] of Object.entries(schema)) {
    if (
      !/^[a-z][a-z0-9_]{0,63}$/.test(key) ||
      ["constructor", "prototype", "__proto__"].includes(key)
    )
      throw new BadRequestException(
        "Custom field keys must use lowercase letters, numbers and underscores",
      );
    const field = typeof raw === "string" ? { type: raw, label: key } : raw;
    if (
      !field ||
      !types.includes(field.type) ||
      typeof field.label !== "string" ||
      !field.label.trim()
    )
      throw new BadRequestException(
        `Invalid definition for custom field ${key}`,
      );
    if (field.required !== undefined && typeof field.required !== "boolean")
      throw new BadRequestException(`Invalid required flag for ${key}`);
    if (
      ["select", "multiselect"].includes(field.type) &&
      (!Array.isArray(field.options) ||
        !field.options.length ||
        field.options.some((v: any) => typeof v !== "string" || !v))
    )
      throw new BadRequestException(
        `Provide string options for ${field.label}`,
      );
    if (field.order !== undefined && !Number.isFinite(field.order))
      throw new BadRequestException(`Invalid order for ${key}`);
    result[key] = field;
  }
  return result;
}

export function customValues(
  schema: Record<string, any>,
  existing: Record<string, any>,
  patch: Record<string, any> = {},
  defaults = false,
) {
  const fields = customDefinitions(schema);
  if (!patch || Array.isArray(patch) || typeof patch !== "object")
    throw new BadRequestException("Custom field values must be an object");
  const result = { ...existing };
  for (const [key, value] of Object.entries(patch)) {
    if (!Object.prototype.hasOwnProperty.call(fields, key))
      throw new BadRequestException(`Unknown custom field: ${key}`);
    if (value === null) delete result[key];
    else result[key] = value;
  }
  for (const [key, field] of Object.entries(fields)) {
    if (
      defaults &&
      result[key] === undefined &&
      !Object.prototype.hasOwnProperty.call(patch, key) &&
      field.default !== undefined
    )
      result[key] = field.default;
    const value = result[key];
    const empty =
      value === null ||
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && !value.length);
    if (empty) {
      if (field.required)
        throw new BadRequestException(`${field.label} is required`);
      continue;
    }
    let valid = true;
    switch (field.type) {
      case "text":
      case "textarea":
        valid =
          typeof value === "string" &&
          value.length <= 10000 &&
          (!field.required || !!value.trim());
        break;
      case "number":
        valid = typeof value === "number" && Number.isFinite(value);
        break;
      case "boolean":
        valid = typeof value === "boolean";
        break;
      case "date":
        valid =
          typeof value === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(value) &&
          !Number.isNaN(Date.parse(value)) &&
          new Date(value).toISOString().slice(0, 10) === value;
        break;
      case "select":
        valid = field.options!.includes(value);
        break;
      case "multiselect":
        valid =
          Array.isArray(value) &&
          new Set(value).size === value.length &&
          value.every((v) => field.options!.includes(v));
        break;
      case "user":
        valid = typeof value === "string" && RECORD_ID.test(value);
        break;
    }
    if (!valid)
      throw new BadRequestException(`Invalid value for ${field.label}`);
  }
  return result;
}
