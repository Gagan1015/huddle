import { z } from "zod";

import {
  idSchema,
  nonEmptyTextSchema,
  positionUpdateSchema,
  timestampSchema,
} from "./common.js";

export const DEFAULT_COLUMN_NAMES = [
  "Upcoming",
  "In progress",
  "Done",
] as const;

export const boardColumnSchema = z.object({
  id: idSchema,
  name: z.string(),
  position: z.number().int().nonnegative(),
  boardId: idSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createColumnInputSchema = z.object({
  name: nonEmptyTextSchema(191),
});

export const updateColumnInputSchema = z.object({
  name: nonEmptyTextSchema(191),
});

// Clients express order as a target index among the board's columns; the API
// converts it into a gapped position so concurrent clients converge.
export const moveColumnInputSchema = z.object({
  index: z.number().int().nonnegative(),
});

export const deleteColumnInputSchema = z.object({
  destinationColumnId: idSchema.optional(),
});

export const columnDeletedPayloadSchema = z.object({
  boardId: idSchema,
  columnId: idSchema,
  destinationColumnId: idSchema.nullable(),
  movedIssueIds: z.array(idSchema),
});

export const columnMovedPayloadSchema = z.object({
  column: boardColumnSchema,
  rebalanced: z.array(positionUpdateSchema),
});

export type BoardColumn = z.infer<typeof boardColumnSchema>;
export type CreateColumnInput = z.infer<typeof createColumnInputSchema>;
export type UpdateColumnInput = z.infer<typeof updateColumnInputSchema>;
export type MoveColumnInput = z.infer<typeof moveColumnInputSchema>;
export type DeleteColumnInput = z.infer<typeof deleteColumnInputSchema>;
export type ColumnDeletedPayload = z.infer<typeof columnDeletedPayloadSchema>;
export type ColumnMovedPayload = z.infer<typeof columnMovedPayloadSchema>;
