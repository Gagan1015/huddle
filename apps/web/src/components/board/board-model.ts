import type { BoardDetail } from "@huddle/shared";

export type ItemsByColumn = Record<string, string[]>;

export interface BoardLayout {
  columnOrder: string[];
  items: ItemsByColumn;
}

// The board API returns columns and issues pre-sorted by position, so the
// layout is just IDs grouped by column in that order.
export function buildLayout(board: BoardDetail): BoardLayout {
  const items: ItemsByColumn = {};

  for (const column of board.columns) {
    items[column.id] = [];
  }

  for (const issue of board.issues) {
    (items[issue.columnId] ??= []).push(issue.id);
  }

  return { columnOrder: board.columns.map((column) => column.id), items };
}

export function indexById<T extends { id: string }>(list: readonly T[]) {
  return new Map(list.map((item) => [item.id, item] as const));
}

export function locateIssue(items: ItemsByColumn, issueId: string) {
  for (const [columnId, ids] of Object.entries(items)) {
    const index = ids.indexOf(issueId);
    if (index !== -1) {
      return { columnId, index };
    }
  }
  return null;
}

/** Index that appends to the end of any column; the API clamps it. */
export const APPEND_INDEX = 1_000_000;

let lastDragEndedAt = 0;

export function markDragEnded() {
  lastDragEndedAt = Date.now();
}

// A pointer drag ends with a click on the same element; ignore that click so a
// dropped card does not also open.
export function dragEndedRecently(windowMs = 300) {
  return Date.now() - lastDragEndedAt < windowMs;
}
