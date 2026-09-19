import {
  IMPORT_MAX_ISSUES,
  ISSUE_DESCRIPTION_MAX,
  ISSUE_TITLE_MAX,
  importedIssueListSchema,
  type ImportedIssue,
} from "@huddle/shared";

// Validation gate between the model and the database. Policy decisions live
// here so they are explicit and unit-tested: safe fields are normalized before
// validation, an unknown column rejects the whole import (no silent fallback),
// and anything past the cap is dropped rather than failing the import.

export type ImportParseFailure = "MALFORMED" | "UNKNOWN_COLUMN" | "NO_TASKS";

export class ImportParseError extends Error {
  readonly code: ImportParseFailure;
  readonly details: unknown;

  constructor(code: ImportParseFailure, message: string, details?: unknown) {
    super(message);
    this.name = "ImportParseError";
    this.code = code;
    this.details = details;
  }
}

export interface ParsedImport {
  tasks: ImportedIssue[];
  /** Tasks the model returned beyond the cap; reported, never created. */
  dropped: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clip(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

function normalizeTitle(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  return clip(value.replace(/\s+/g, " ").trim(), ISSUE_TITLE_MAX);
}

function normalizeDescription(value: unknown): unknown {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value !== "string") {
    return value;
  }

  const text = value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return clip(text, ISSUE_DESCRIPTION_MAX);
}

function normalizeTask(task: unknown): unknown {
  if (!isRecord(task)) {
    return task;
  }

  return {
    ...task,
    title: normalizeTitle(task.title),
    description: normalizeDescription(task.description),
  };
}

export function parseExtractedTasks(
  raw: unknown,
  allowedColumnIds: readonly string[],
  maxTasks: number = IMPORT_MAX_ISSUES,
): ParsedImport {
  const candidate =
    isRecord(raw) && Array.isArray(raw.tasks)
      ? { ...raw, tasks: raw.tasks.map(normalizeTask) }
      : raw;

  const parsed = importedIssueListSchema.safeParse(candidate);

  if (!parsed.success) {
    throw new ImportParseError(
      "MALFORMED",
      "The model response did not match the expected task list.",
      parsed.error.issues.map((issue) => ({
        path: issue.path.map(String).join("."),
        message: issue.message,
      })),
    );
  }

  if (parsed.data.tasks.length === 0) {
    throw new ImportParseError(
      "NO_TASKS",
      "The model found nothing actionable in the notes.",
    );
  }

  const allowed = new Set(allowedColumnIds);
  const unknownColumns = parsed.data.tasks
    .map((task) => task.columnId)
    .filter((columnId) => !allowed.has(columnId));

  if (unknownColumns.length > 0) {
    throw new ImportParseError(
      "UNKNOWN_COLUMN",
      "The model assigned a task to a column that is not on the board.",
      [...new Set(unknownColumns)],
    );
  }

  const tasks = parsed.data.tasks.slice(0, maxTasks);

  return { tasks, dropped: parsed.data.tasks.length - tasks.length };
}
