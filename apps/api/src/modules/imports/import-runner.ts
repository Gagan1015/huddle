import type {
  ApiErrorCode,
  ImportedIssue,
  ImportResult,
  Issue,
  ServerEventName,
  ServerEventPayload,
} from "@huddle/shared";

import { HttpError } from "../../lib/http-error.js";
import { boardScope, type BoardScope } from "../../realtime/rooms.js";
import {
  ImportParseError,
  parseExtractedTasks,
  type ImportParseFailure,
} from "./import-parser.js";
import type { scheduleStaggered } from "./import-scheduler.js";
import {
  TaskExtractionError,
  type TaskExtractionFailure,
  type TaskExtractor,
} from "./task-extractor.js";

// Orchestrates one import end to end. Everything with side effects (the model,
// the database, the socket transport, timers, IDs) is injected so the flow can
// be tested with fixture responses and no Claude call.

export interface ImportRequest {
  userId: string;
  board: { id: string; organizationId: string };
  /** The board's columns in display order. */
  columns: readonly { id: string; name: string }[];
  notes: string;
}

export interface ImportLogger {
  info(fields: Record<string, unknown>, message: string): void;
  warn(fields: Record<string, unknown>, message: string): void;
}

export interface ImportPorts {
  extractor: TaskExtractor;
  /** Creates every task in one transaction and returns the issues in order. */
  persistIssues(
    request: ImportRequest,
    tasks: readonly ImportedIssue[],
  ): Promise<Issue[]>;
  publish<E extends ServerEventName>(
    scope: BoardScope,
    event: E,
    payload: ServerEventPayload<E>,
  ): void;
  schedule: typeof scheduleStaggered;
  newImportId(): string;
  cardIntervalMs: number;
  maxTasks: number;
  logger: ImportLogger;
}

interface Failure {
  status: number;
  code: ApiErrorCode;
  message: string;
}

// User-facing copy per failure. Provider details and prompts never leave the
// server; the log line carries the cause for operators.
const EXTRACTION_FAILURES: Record<TaskExtractionFailure, Failure> = {
  misconfigured: {
    status: 503,
    code: "IMPORT_UNAVAILABLE",
    message: "Meeting-notes import is not set up correctly on this server.",
  },
  rate_limited: {
    status: 429,
    code: "RATE_LIMITED",
    message: "Claude is busy right now. Wait a moment and try again.",
  },
  unavailable: {
    status: 502,
    code: "IMPORT_FAILED",
    message: "Claude could not be reached. Try again in a moment.",
  },
  refused: {
    status: 502,
    code: "IMPORT_FAILED",
    message:
      "Claude declined to turn these notes into tasks. Rephrase them and try again.",
  },
  truncated: {
    status: 502,
    code: "IMPORT_FAILED",
    message:
      "These notes produced more than Claude could return. Trim them and try again.",
  },
  malformed: {
    status: 502,
    code: "IMPORT_FAILED",
    message: "Claude's reply could not be read. Try again.",
  },
};

const PARSE_FAILURES: Record<ImportParseFailure, Failure> = {
  MALFORMED: {
    status: 502,
    code: "IMPORT_FAILED",
    message: "Claude's reply did not match what Huddle expected. Try again.",
  },
  UNKNOWN_COLUMN: {
    status: 502,
    code: "IMPORT_FAILED",
    message: "Claude chose a column that is not on this board. Try again.",
  },
  NO_TASKS: {
    status: 422,
    code: "IMPORT_NO_TASKS",
    message:
      "No actionable tasks were found in these notes. Add a few decisions or follow-ups and try again.",
  },
};

const UNEXPECTED_FAILURE: Failure = {
  status: 502,
  code: "IMPORT_FAILED",
  message: "Claude could not turn these notes into tasks right now. Try again.",
};

const SAVE_FAILURE_MESSAGE = "The tasks could not be saved. Try again.";

function describeFailure(error: unknown): Failure & { reason: string } {
  if (error instanceof TaskExtractionError) {
    return { ...EXTRACTION_FAILURES[error.kind], reason: error.kind };
  }

  if (error instanceof ImportParseError) {
    return { ...PARSE_FAILURES[error.code], reason: error.code };
  }

  return { ...UNEXPECTED_FAILURE, reason: "unexpected" };
}

export async function runImport(
  request: ImportRequest,
  ports: ImportPorts,
): Promise<ImportResult> {
  const importId = ports.newImportId();
  const boardId = request.board.id;
  const scope = boardScope(request.board);
  const startedAt = Date.now();
  const baseFields = {
    importId,
    boardId,
    organizationId: scope.organizationId,
  };

  // Announce before the model call so every viewer sees the board is busy.
  ports.publish(scope, "import:started", {
    importId,
    boardId,
    requestedById: request.userId,
  });

  let tasks: ImportedIssue[];
  let dropped: number;

  try {
    const raw = await ports.extractor.extractTasks({
      notes: request.notes,
      columns: request.columns,
      maxTasks: ports.maxTasks,
    });
    ({ tasks, dropped } = parseExtractedTasks(
      raw,
      request.columns.map((column) => column.id),
      ports.maxTasks,
    ));
  } catch (error) {
    const failure = describeFailure(error);
    ports.publish(scope, "import:failed", {
      importId,
      boardId,
      message: failure.message,
    });
    ports.logger.warn(
      {
        ...baseFields,
        reason: failure.reason,
        code: failure.code,
        durationMs: Date.now() - startedAt,
        err: error,
      },
      "Meeting-notes import produced no issues",
    );
    throw new HttpError(failure.status, failure.code, failure.message);
  }

  let issues: Issue[];

  try {
    issues = await ports.persistIssues(request, tasks);
  } catch (error) {
    ports.publish(scope, "import:failed", {
      importId,
      boardId,
      message: SAVE_FAILURE_MESSAGE,
    });
    ports.logger.warn(
      { ...baseFields, durationMs: Date.now() - startedAt, err: error },
      "Meeting-notes import could not save issues",
    );
    throw error;
  }

  const total = issues.length;

  // Everything is committed; the stagger is presentation only.
  ports.schedule(
    total,
    ports.cardIntervalMs,
    (index) => {
      const issue = issues[index];
      if (issue) {
        ports.publish(scope, "import:card", {
          importId,
          boardId,
          issue,
          index: index + 1,
          total,
        });
      }
    },
    () => ports.publish(scope, "import:done", { importId, boardId, total }),
  );

  ports.logger.info(
    { ...baseFields, total, dropped, durationMs: Date.now() - startedAt },
    "Meeting-notes import created issues",
  );

  return { importId, boardId, total, issues };
}
