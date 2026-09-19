import { z } from "zod";

export const idSchema = z.string().min(1).max(191);

// Dates cross the wire as ISO-8601 strings; the API serializes `Date` values.
export const timestampSchema = z.string();

export const nonEmptyTextSchema = (max: number) =>
  z.string().trim().min(1).max(max);

export const optionalTextSchema = (max: number) =>
  z.string().trim().max(max).optional();
