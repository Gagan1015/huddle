import { z } from "zod";

import { idSchema, nonEmptyTextSchema } from "./common.js";
import {
  ISSUE_DESCRIPTION_MAX,
  ISSUE_TITLE_MAX,
  issueSchema,
} from "./issues.js";

/** Upper bound on pasted notes; long enough for an hour of notes, short enough to cap cost. */
export const MEETING_NOTES_MAX = 20_000;

/** Hard cap on issues created per import so one paste cannot flood a board. */
export const IMPORT_MAX_ISSUES = 25;

export const importNotesInputSchema = z.object({
  notes: z
    .string()
    .trim()
    .min(1, "Paste some meeting notes first.")
    .max(MEETING_NOTES_MAX, "Notes are too long. Trim them and try again."),
});

// Shape Claude must return for each task extracted from meeting notes. The
// column must be one of the board's existing columns; Claude never creates one.
export const importedIssueSchema = z.object({
  title: nonEmptyTextSchema(ISSUE_TITLE_MAX),
  description: z.string().trim().max(ISSUE_DESCRIPTION_MAX).default(""),
  columnId: idSchema,
});

// The complete model response. Wrapping the list in an object keeps the
// structured output a JSON object and leaves room for metadata later.
export const importedIssueListSchema = z.object({
  tasks: z.array(importedIssueSchema),
});

// REST response. Issues are also delivered one by one over `import:card`, so
// connected clients reconcile from those events and ignore this list.
export const importResultSchema = z.object({
  importId: idSchema,
  boardId: idSchema,
  total: z.number().int().nonnegative(),
  issues: z.array(issueSchema),
});

export const importStartedPayloadSchema = z.object({
  importId: idSchema,
  boardId: idSchema,
  requestedById: idSchema,
});

export const importCardPayloadSchema = z.object({
  importId: idSchema,
  boardId: idSchema,
  issue: issueSchema,
  /** 1-based position of this card in the import, for "3 of 6" progress. */
  index: z.number().int().positive(),
  total: z.number().int().positive(),
});

export const importDonePayloadSchema = z.object({
  importId: idSchema,
  boardId: idSchema,
  total: z.number().int().nonnegative(),
});

export const importFailedPayloadSchema = z.object({
  importId: idSchema,
  boardId: idSchema,
  message: z.string(),
});

export type ImportNotesInput = z.infer<typeof importNotesInputSchema>;
export type ImportedIssue = z.infer<typeof importedIssueSchema>;
export type ImportedIssueList = z.infer<typeof importedIssueListSchema>;
export type ImportResult = z.infer<typeof importResultSchema>;
export type ImportStartedPayload = z.infer<typeof importStartedPayloadSchema>;
export type ImportCardPayload = z.infer<typeof importCardPayloadSchema>;
export type ImportDonePayload = z.infer<typeof importDonePayloadSchema>;
export type ImportFailedPayload = z.infer<typeof importFailedPayloadSchema>;
