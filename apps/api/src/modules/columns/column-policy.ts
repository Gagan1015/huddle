import { HttpError } from "../../lib/http-error.js";

export interface ColumnDeletionInput {
  columnId: string;
  /** Number of columns currently on the board, including this one. */
  columnCount: number;
  /** Number of issues currently in this column. */
  issueCount: number;
  destinationColumnId: string | null;
}

export interface ColumnDeletionDecision {
  /** Column that receives the issues, or null when nothing needs moving. */
  destinationColumnId: string | null;
}

// Pure policy for column deletion so the rules are testable without a database:
// a board keeps at least one column, and a non-empty column needs a destination.
export function resolveColumnDeletion(
  input: ColumnDeletionInput,
): ColumnDeletionDecision {
  if (input.columnCount <= 1) {
    throw new HttpError(
      409,
      "LAST_COLUMN",
      "A board needs at least one column.",
    );
  }

  if (input.destinationColumnId === input.columnId) {
    throw new HttpError(
      400,
      "DESTINATION_COLUMN_INVALID",
      "Choose a different column to receive the issues.",
    );
  }

  if (input.issueCount === 0) {
    return { destinationColumnId: null };
  }

  if (!input.destinationColumnId) {
    throw new HttpError(
      409,
      "COLUMN_NOT_EMPTY",
      "Choose where to move this column's issues before deleting it.",
    );
  }

  return { destinationColumnId: input.destinationColumnId };
}
