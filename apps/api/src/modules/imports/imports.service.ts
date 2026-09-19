import { randomUUID } from "node:crypto";

import {
  IMPORT_MAX_ISSUES,
  type ImportNotesInput,
  type ImportResult,
} from "@huddle/shared";

import { requireBoardAccess } from "../../auth/authorization.js";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../lib/http-error.js";
import { logger } from "../../lib/logger.js";
import { toIssueDto } from "../../lib/serializers.js";
import { publishToBoard } from "../../realtime/board-events.js";
import { insertIssue } from "../issues/issues.service.js";
import { runImport, type ImportPorts } from "./import-runner.js";
import { scheduleStaggered } from "./import-scheduler.js";
import {
  createAnthropicTaskExtractor,
  type TaskExtractor,
} from "./task-extractor.js";

/** Gap between `import:card` emissions so cards visibly land one by one. */
export const IMPORT_CARD_INTERVAL_MS = 300;

let extractor: TaskExtractor | null | undefined;

// Built lazily so importing this module never constructs an SDK client, and
// resolved to null when no key is configured so the route can say so plainly.
function getTaskExtractor(): TaskExtractor | null {
  if (extractor === undefined) {
    extractor = env.ANTHROPIC_API_KEY
      ? createAnthropicTaskExtractor({
          apiKey: env.ANTHROPIC_API_KEY,
          model: env.ANTHROPIC_MODEL,
        })
      : null;
  }

  return extractor;
}

const persistIssues: ImportPorts["persistIssues"] = async (request, tasks) => {
  // All or nothing: a failure part-way leaves no half-imported board.
  const rows = await prisma.$transaction(async (tx) => {
    const created = [];

    for (const task of tasks) {
      created.push(
        await insertIssue(tx, {
          columnId: task.columnId,
          title: task.title,
          description: task.description || null,
          source: "AI_IMPORT",
          createdById: request.userId,
        }),
      );
    }

    return created;
  });

  return rows.map((row) => toIssueDto(row, request.board.id));
};

export async function importMeetingNotes(
  userId: string,
  boardId: string,
  input: ImportNotesInput,
): Promise<ImportResult> {
  const board = await requireBoardAccess(userId, boardId);
  const taskExtractor = getTaskExtractor();

  if (!taskExtractor) {
    throw new HttpError(
      503,
      "IMPORT_UNAVAILABLE",
      "Meeting-notes import is not configured on this server.",
    );
  }

  const columns = await prisma.boardColumn.findMany({
    where: { boardId },
    orderBy: { position: "asc" },
    select: { id: true, name: true },
  });

  if (columns.length === 0) {
    throw new HttpError(
      409,
      "COLUMN_NOT_FOUND",
      "Add a column to this board before importing notes.",
    );
  }

  return runImport(
    { userId, board, columns, notes: input.notes },
    {
      extractor: taskExtractor,
      persistIssues,
      publish: publishToBoard,
      schedule: scheduleStaggered,
      newImportId: randomUUID,
      cardIntervalMs: IMPORT_CARD_INTERVAL_MS,
      maxTasks: IMPORT_MAX_ISSUES,
      logger: logger.child({ module: "imports" }),
    },
  );
}
