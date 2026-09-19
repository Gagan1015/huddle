import type { BoardColumn, BoardDetail, Issue } from "@huddle/shared";
import { describe, expect, it } from "vitest";

import {
  applyBoardEvent,
  mapStable,
  mergeBoard,
  syncSummary,
} from "./board-events";

const T0 = "2026-09-19T10:00:00.000Z";
const T1 = "2026-09-19T10:00:01.000Z";
const T2 = "2026-09-19T10:00:02.000Z";

function column(id: string, position: number, updatedAt = T0): BoardColumn {
  return {
    id,
    name: id,
    position,
    boardId: "board_1",
    createdAt: T0,
    updatedAt,
  };
}

function issue(
  id: string,
  columnId: string,
  position: number,
  updatedAt = T0,
): Issue {
  return {
    id,
    title: id,
    description: null,
    position,
    source: "MANUAL",
    priority: "NONE",
    dueDate: null,
    columnId,
    boardId: "board_1",
    createdById: null,
    assigneeId: null,
    assignedById: null,
    createdAt: T0,
    updatedAt,
  };
}

function board(): BoardDetail {
  return {
    id: "board_1",
    title: "Roadmap",
    description: null,
    organizationId: "org_1",
    createdById: null,
    createdAt: T0,
    updatedAt: T0,
    columns: [
      column("todo", 1024),
      column("doing", 2048),
      column("done", 3072),
    ],
    issues: [
      issue("a", "todo", 1024),
      issue("b", "todo", 2048),
      issue("c", "doing", 1024),
    ],
  };
}

const ids = (list: readonly { id: string }[]) => list.map((item) => item.id);

describe("applyBoardEvent", () => {
  it("inserts a created issue by position and treats a replay as a no-op", () => {
    const created = issue("d", "todo", 1536, T1);
    const once = applyBoardEvent(board(), {
      type: "issue:created",
      payload: created,
    });
    const twice = applyBoardEvent(once, {
      type: "issue:created",
      payload: created,
    });

    expect(ids(once.issues.filter((i) => i.columnId === "todo"))).toEqual([
      "a",
      "d",
      "b",
    ]);
    expect(twice).toBe(once);
  });

  it("ignores an update older than the cached copy", () => {
    const fresh = applyBoardEvent(board(), {
      type: "issue:updated",
      payload: { ...issue("a", "todo", 1024, T2), title: "newest" },
    });
    const stale = applyBoardEvent(fresh, {
      type: "issue:updated",
      payload: { ...issue("a", "todo", 1024, T1), title: "older" },
    });

    expect(stale).toBe(fresh);
    expect(stale.issues.find((i) => i.id === "a")?.title).toBe("newest");
  });

  it("applies rebalanced sibling positions together with the moved issue", () => {
    const next = applyBoardEvent(board(), {
      type: "issue:moved",
      payload: {
        issue: issue("c", "todo", 2048, T1),
        rebalanced: [
          { id: "a", position: 1024 },
          { id: "b", position: 3072 },
        ],
      },
    });

    expect(ids(next.issues.filter((i) => i.columnId === "todo"))).toEqual([
      "a",
      "c",
      "b",
    ]);
    expect(next.issues.filter((i) => i.columnId === "doing")).toEqual([]);
  });

  it("reorders columns from a move without touching issues", () => {
    const start = board();
    const next = applyBoardEvent(start, {
      type: "column:moved",
      payload: { column: column("done", 512, T1), rebalanced: [] },
    });

    expect(ids(next.columns)).toEqual(["done", "todo", "doing"]);
    expect(next.issues).toBe(start.issues);
  });

  it("moves a deleted column's issues to the destination in payload order", () => {
    const next = applyBoardEvent(board(), {
      type: "column:deleted",
      payload: {
        boardId: "board_1",
        columnId: "todo",
        destinationColumnId: "doing",
        movedIssueIds: ["a", "b"],
      },
    });

    expect(ids(next.columns)).toEqual(["doing", "done"]);
    expect(next.issues.map((i) => [i.id, i.columnId, i.position])).toEqual([
      ["c", "doing", 1024],
      ["a", "doing", 2048],
      ["b", "doing", 3072],
    ]);
  });

  it("drops an empty deleted column and leaves the rest untouched", () => {
    const start = board();
    const next = applyBoardEvent(start, {
      type: "column:deleted",
      payload: {
        boardId: "board_1",
        columnId: "done",
        destinationColumnId: null,
        movedIssueIds: [],
      },
    });

    expect(ids(next.columns)).toEqual(["todo", "doing"]);
    expect(next.issues).toHaveLength(3);
  });

  it("treats deleting an unknown issue or column as a no-op", () => {
    const start = board();

    expect(
      applyBoardEvent(start, {
        type: "issue:deleted",
        payload: { boardId: "board_1", columnId: "todo", issueId: "zzz" },
      }),
    ).toBe(start);
    expect(
      applyBoardEvent(start, {
        type: "column:deleted",
        payload: {
          boardId: "board_1",
          columnId: "zzz",
          destinationColumnId: null,
          movedIssueIds: [],
        },
      }),
    ).toBe(start);
  });

  it("ignores events addressed to another board", () => {
    const start = board();

    expect(
      applyBoardEvent(start, {
        type: "issue:created",
        payload: { ...issue("x", "todo", 1), boardId: "board_2" },
      }),
    ).toBe(start);
    expect(
      applyBoardEvent(start, {
        type: "column:created",
        payload: { ...column("x", 1), boardId: "board_2" },
      }),
    ).toBe(start);
  });
});

describe("mergeBoard", () => {
  it("takes newer titles and keeps the current copy otherwise", () => {
    const current = board();
    const newer = { ...current, title: "Renamed", updatedAt: T1 };
    const older = { ...current, title: "Old", updatedAt: T0 };

    expect(mergeBoard(current, newer).title).toBe("Renamed");
    expect(mergeBoard(current, older)).toBe(current);
    expect(mergeBoard(current, { ...newer, id: "board_2" })).toBe(current);
  });
});

describe("summaries", () => {
  it("only produces a new summary when counts differ", () => {
    const detail = board();
    const summary = { ...detail, columnCount: 3, issueCount: 3 };

    expect(syncSummary(summary, detail)).toBe(summary);
    expect(syncSummary({ ...summary, issueCount: 2 }, detail).issueCount).toBe(
      3,
    );
  });

  it("mapStable returns the same array when nothing changed", () => {
    const list = [{ id: "a" }, { id: "b" }];

    expect(mapStable(list, (item) => item)).toBe(list);
    expect(
      mapStable(list, (item) => (item.id === "a" ? { id: "z" } : item)),
    ).toEqual([{ id: "z" }, { id: "b" }]);
  });
});
