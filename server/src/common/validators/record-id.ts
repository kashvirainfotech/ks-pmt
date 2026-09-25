import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { Matches, ValidationOptions } from 'class-validator';

// PostgreSQL accepts canonical UUIDs with any version/variant bits. The original
// seed data uses that format (including the administrator's ...0001 identifier).
// Validate the complete shape without silently dropping legitimate legacy IDs.
export const RECORD_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function IsUUID(
  _version?: string,
  options?: ValidationOptions,
): PropertyDecorator {
  return Matches(RECORD_ID, {
    message: '$property must be a UUID',
    ...options,
  });
}
@Injectable()
export class ParseUUIDPipe implements PipeTransform {
  transform(value: unknown) {
    if (typeof value !== 'string' || !RECORD_ID.test(value))
      throw new BadRequestException('Identifier must be a UUID');
    return value;
  }
}
