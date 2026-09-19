import { z } from "zod";

import {
  idSchema,
  nonEmptyTextSchema,
  optionalTextSchema,
  timestampSchema,
} from "./common.js";

export const ISSUE_TITLE_MAX = 191;
export const ISSUE_DESCRIPTION_MAX = 10_000;

export const issueSourceSchema = z.enum(["MANUAL", "AI_IMPORT"]);

export const issueSchema = z.object({
  id: idSchema,
  title: z.string(),
  description: z.string().nullable(),
  position: z.number().int().nonnegative(),
  source: issueSourceSchema,
  columnId: idSchema,
  boardId: idSchema,
  createdById: idSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createIssueInputSchema = z.object({
  title: nonEmptyTextSchema(ISSUE_TITLE_MAX),
  description: optionalTextSchema(ISSUE_DESCRIPTION_MAX),
});

export const updateIssueInputSchema = z
  .object({
    title: nonEmptyTextSchema(ISSUE_TITLE_MAX),
    description: z.string().trim().max(ISSUE_DESCRIPTION_MAX).nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const moveIssueInputSchema = z.object({
  columnId: idSchema,
  index: z.number().int().nonnegative(),
});

export const issueDeletedPayloadSchema = z.object({
  boardId: idSchema,
  columnId: idSchema,
  issueId: idSchema,
});

// Shape Claude must return for each task extracted from meeting notes.
export const importedIssueSchema = z.object({
  title: nonEmptyTextSchema(ISSUE_TITLE_MAX),
  description: z.string().trim().max(ISSUE_DESCRIPTION_MAX).default(""),
  columnId: idSchema,
});

export type IssueSource = z.infer<typeof issueSourceSchema>;
export type Issue = z.infer<typeof issueSchema>;
export type CreateIssueInput = z.infer<typeof createIssueInputSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueInputSchema>;
export type MoveIssueInput = z.infer<typeof moveIssueInputSchema>;
export type IssueDeletedPayload = z.infer<typeof issueDeletedPayloadSchema>;
export type ImportedIssue = z.infer<typeof importedIssueSchema>;
