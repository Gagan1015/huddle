import { z } from "zod";

import {
  idSchema,
  nonEmptyTextSchema,
  optionalTextSchema,
  positionUpdateSchema,
  timestampSchema,
} from "./common.js";

export const ISSUE_TITLE_MAX = 191;
export const ISSUE_DESCRIPTION_MAX = 10_000;

export const issueSourceSchema = z.enum(["MANUAL", "AI_IMPORT"]);

// Ordered from least to most pressing; `NONE` is the default and renders as
// no badge at all.
export const issuePrioritySchema = z.enum([
  "NONE",
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);
export const ISSUE_PRIORITIES = issuePrioritySchema.options;

// Calendar date with no time zone, exchanged as YYYY-MM-DD.
export const dueDateSchema = z.iso.date();

export const issueSchema = z.object({
  id: idSchema,
  title: z.string(),
  description: z.string().nullable(),
  position: z.number().int().nonnegative(),
  source: issueSourceSchema,
  priority: issuePrioritySchema,
  dueDate: dueDateSchema.nullable(),
  columnId: idSchema,
  boardId: idSchema,
  createdById: idSchema.nullable(),
  assigneeId: idSchema.nullable(),
  assignedById: idSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createIssueInputSchema = z.object({
  title: nonEmptyTextSchema(ISSUE_TITLE_MAX),
  description: optionalTextSchema(ISSUE_DESCRIPTION_MAX),
  priority: issuePrioritySchema.optional(),
  assigneeId: idSchema.nullable().optional(),
  dueDate: dueDateSchema.nullable().optional(),
});

export const updateIssueInputSchema = z
  .object({
    title: nonEmptyTextSchema(ISSUE_TITLE_MAX),
    description: z.string().trim().max(ISSUE_DESCRIPTION_MAX).nullable(),
    priority: issuePrioritySchema,
    assigneeId: idSchema.nullable(),
    dueDate: dueDateSchema.nullable(),
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

export const issueMovedPayloadSchema = z.object({
  issue: issueSchema,
  rebalanced: z.array(positionUpdateSchema),
});

export type IssueSource = z.infer<typeof issueSourceSchema>;
export type IssuePriority = z.infer<typeof issuePrioritySchema>;
export type Issue = z.infer<typeof issueSchema>;
export type CreateIssueInput = z.infer<typeof createIssueInputSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueInputSchema>;
export type MoveIssueInput = z.infer<typeof moveIssueInputSchema>;
export type IssueDeletedPayload = z.infer<typeof issueDeletedPayloadSchema>;
export type IssueMovedPayload = z.infer<typeof issueMovedPayloadSchema>;
