import { BadRequestException } from '@nestjs/common';
export function validateDateRanges(
  dto: Record<string, any>,
  existing: Record<string, any> = {},
) {
  const value = (key: string) =>
    dto[key] ?? existing[key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)];
  for (const [start, end] of [
    ['plannedStartDate', 'plannedEndDate'],
    ['actualStartDate', 'actualEndDate'],
    ['licenseStartDate', 'licenseEndDate'],
    ['startDate', 'endDate'],
    ['plannedStartDate', 'targetReleaseDate'],
    ['timerStartTime', 'timerEndTime'],
  ]) {
    if (
      value(start) &&
      value(end) &&
      new Date(value(end)) < new Date(value(start))
    )
      throw new BadRequestException(`${end} must be on or after ${start}`);
  }
}
