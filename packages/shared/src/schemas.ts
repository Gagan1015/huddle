import { z } from "zod";

export const idSchema = z.string().min(1);

export const boardColumnSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(191),
  position: z.number().int().nonnegative(),
  boardId: idSchema,
});

export const issueSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(191),
  description: z.string().nullable(),
  position: z.number().int().nonnegative(),
  source: z.enum(["MANUAL", "AI_IMPORT"]),
  columnId: idSchema,
});

export const importedIssueSchema = z.object({
  title: z.string().trim().min(1).max(191),
  description: z.string().trim().max(10_000).default(""),
  columnId: idSchema,
});

export type BoardColumn = z.infer<typeof boardColumnSchema>;
export type Issue = z.infer<typeof issueSchema>;
export type ImportedIssue = z.infer<typeof importedIssueSchema>;
