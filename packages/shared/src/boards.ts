import { z } from "zod";

import { boardColumnSchema } from "./columns.js";
import {
  idSchema,
  nonEmptyTextSchema,
  optionalTextSchema,
  timestampSchema,
} from "./common.js";
import { issueSchema } from "./issues.js";

export const boardSchema = z.object({
  id: idSchema,
  title: z.string(),
  description: z.string().nullable(),
  organizationId: idSchema,
  createdById: idSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const boardSummarySchema = boardSchema.extend({
  columnCount: z.number().int().nonnegative(),
  issueCount: z.number().int().nonnegative(),
});

// Everything a board view needs in one round trip. Columns and issues are
// returned pre-sorted by position.
export const boardDetailSchema = boardSchema.extend({
  columns: z.array(boardColumnSchema),
  issues: z.array(issueSchema),
});

export const createBoardInputSchema = z.object({
  title: nonEmptyTextSchema(191),
  description: optionalTextSchema(2000),
});

export const updateBoardInputSchema = z
  .object({
    title: nonEmptyTextSchema(191),
    description: z.string().trim().max(2000).nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const boardDeletedPayloadSchema = z.object({
  organizationId: idSchema,
  boardId: idSchema,
});

export type Board = z.infer<typeof boardSchema>;
export type BoardSummary = z.infer<typeof boardSummarySchema>;
export type BoardDetail = z.infer<typeof boardDetailSchema>;
export type CreateBoardInput = z.infer<typeof createBoardInputSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardInputSchema>;
export type BoardDeletedPayload = z.infer<typeof boardDeletedPayloadSchema>;
