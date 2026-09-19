// Due dates are calendar dates with no time zone. MySQL stores them as DATE;
// Prisma reads that back as midnight UTC, so both directions pin to UTC.

export function dueDateToDb(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function dueDateFromDb(value: Date): string {
  return value.toISOString().slice(0, 10);
}
