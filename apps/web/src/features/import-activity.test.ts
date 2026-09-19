import type { Issue } from "@huddle/shared";
import { describe, expect, it } from "vitest";

import {
  IDLE_IMPORT,
  reduceImportActivity,
  type ImportActivity,
  type ImportEvent,
} from "./import-activity";

const BOARD = "board_1";

const issue: Issue = {
  id: "iss_1",
  title: "Ship it",
  description: null,
  position: 1024,
  source: "AI_IMPORT",
  priority: "NONE",
  dueDate: null,
  columnId: "col_1",
  boardId: BOARD,
  createdById: "user_priya",
  assigneeId: null,
  assignedById: null,
  createdAt: "2026-09-19T10:00:00.000Z",
  updatedAt: "2026-09-19T10:00:00.000Z",
};

const started = (importId = "imp_1"): ImportEvent => ({
  type: "import:started",
  payload: { importId, boardId: BOARD, requestedById: "user_priya" },
});
const card = (index: number, total = 3, importId = "imp_1"): ImportEvent => ({
  type: "import:card",
  payload: { importId, boardId: BOARD, issue, index, total },
});
const done = (importId = "imp_1", total = 3): ImportEvent => ({
  type: "import:done",
  payload: { importId, boardId: BOARD, total },
});
const failed = (importId = "imp_1"): ImportEvent => ({
  type: "import:failed",
  payload: {
    importId,
    boardId: BOARD,
    message: "Claude could not be reached.",
  },
});

function run(events: ImportEvent[], from: ImportActivity = IDLE_IMPORT) {
  return events.reduce(
    (state, event) => reduceImportActivity(state, event, BOARD),
    from,
  );
}

describe("reduceImportActivity", () => {
  it("walks from extracting through creating to a summary", () => {
    const extracting = run([started()]);
    expect(extracting).toEqual({
      phase: "extracting",
      importId: "imp_1",
      boardId: BOARD,
      requestedById: "user_priya",
    });

    const creating = run([card(1), card(2)], extracting);
    expect(creating).toEqual({
      phase: "creating",
      importId: "imp_1",
      boardId: BOARD,
      requestedById: "user_priya",
      received: 2,
      total: 3,
    });

    expect(run([card(3), done()], creating)).toEqual({
      phase: "done",
      importId: "imp_1",
      boardId: BOARD,
      total: 3,
    });
  });

  it("copes with a missed start and out-of-order or duplicate cards", () => {
    const fromCard = run([card(2)]);
    expect(fromCard).toMatchObject({
      phase: "creating",
      requestedById: null,
      received: 2,
    });

    const afterOlderCard = run([card(1)], fromCard);
    expect(afterOlderCard).toBe(fromCard);
    expect(run([card(2)], fromCard)).toBe(fromCard);
  });

  it("ignores a late card once the summary is showing", () => {
    const finished = run([started(), card(1), card(2), card(3), done()]);

    expect(run([card(3)], finished)).toBe(finished);
    expect(run([done()], finished)).toBe(finished);
  });

  it("records a failure with its message and treats a repeat as a no-op", () => {
    const state = run([started(), failed()]);

    expect(state).toEqual({
      phase: "failed",
      importId: "imp_1",
      boardId: BOARD,
      message: "Claude could not be reached.",
    });
    expect(run([failed()], state)).toBe(state);
  });

  it("does not let another import's summary interrupt one in progress", () => {
    const creating = run([started(), card(1)]);

    expect(run([done("imp_other")], creating)).toBe(creating);
    expect(run([failed("imp_other")], creating)).toBe(creating);
    expect(run([started("imp_other")], creating)).toMatchObject({
      phase: "extracting",
      importId: "imp_other",
    });
  });

  it("ignores events for other boards", () => {
    const foreign: ImportEvent = {
      type: "import:started",
      payload: { importId: "imp_9", boardId: "board_2", requestedById: "u" },
    };

    expect(run([foreign])).toBe(IDLE_IMPORT);
  });
});
