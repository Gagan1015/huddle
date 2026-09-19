import { z } from "zod";

export const idSchema = z.string().min(1).max(191);

// Dates cross the wire as ISO-8601 strings; the API serializes `Date` values.
export const timestampSchema = z.string();

export const nonEmptyTextSchema = (max: number) =>
  z.string().trim().min(1).max(max);

export const optionalTextSchema = (max: number) =>
  z.string().trim().max(max).optional();

/** Gap between adjacent column/issue positions; shared so clients can predict appended positions. */
export const POSITION_GAP = 1024;

// Siblings whose gapped positions were rewritten during a move. Clients apply
// these alongside the moved item so every order converges without a refetch.
export const positionUpdateSchema = z.object({
  id: idSchema,
  position: z.number().int().nonnegative(),
});

export type PositionUpdate = z.infer<typeof positionUpdateSchema>;
