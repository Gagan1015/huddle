import {
  POSITION_GAP,
  type Board,
  type BoardColumn,
  type BoardDetail,
  type BoardRoomEvent,
  type BoardSummary,
  type ColumnDeletedPayload,
  type Issue,
  type IssueDeletedPayload,
  type PositionUpdate,
} from "@huddle/shared";

// Pure reducers that fold socket events into the cached board. Every branch
// returns the same object when nothing changes so duplicate or stale events
// never cause a re-render, and ISO timestamps decide which copy is newer.

interface Versioned {
  id: string;
  position: number;
  updatedAt: string;
}

const byPosition = (a: Versioned, b: Versioned) =>
  a.position - b.position || a.id.localeCompare(b.id);

function isNewer(list: readonly Versioned[], incoming: Versioned) {
  const existing = list.find((item) => item.id === incoming.id);
  return existing === undefined || existing.updatedAt < incoming.updatedAt;
}

function upsert<T extends Versioned>(list: readonly T[], item: T): T[] {
  return [...list.filter((entry) => entry.id !== item.id), item].sort(
    byPosition,
  );
}

function reposition<T extends Versioned>(
  list: readonly T[],
  updates: readonly PositionUpdate[],
): T[] {
  if (updates.length === 0) {
    return [...list];
  }

  const positions = new Map(
    updates.map((update) => [update.id, update.position] as const),
  );

  return list.map((item) => {
    const position = positions.get(item.id);
    return position === undefined || position === item.position
      ? item
      : { ...item, position };
  });
}

function withColumn(
  board: BoardDetail,
  column: BoardColumn,
  rebalanced: readonly PositionUpdate[],
): BoardDetail {
  if (column.boardId !== board.id || !isNewer(board.columns, column)) {
    return board;
  }

  return {
    ...board,
    columns: upsert(reposition(board.columns, rebalanced), column),
  };
}

function withIssue(
  board: BoardDetail,
  issue: Issue,
  rebalanced: readonly PositionUpdate[],
): BoardDetail {
  if (issue.boardId !== board.id || !isNewer(board.issues, issue)) {
    return board;
  }

  return {
    ...board,
    issues: upsert(reposition(board.issues, rebalanced), issue),
  };
}

function withoutColumn(
  board: BoardDetail,
  payload: ColumnDeletedPayload,
): BoardDetail {
  if (payload.boardId !== board.id) {
    return board;
  }

  const { columnId, destinationColumnId, movedIssueIds } = payload;
  const columns = board.columns.filter((column) => column.id !== columnId);
  const strays = board.issues.filter((issue) => issue.columnId === columnId);

  if (columns.length === board.columns.length && strays.length === 0) {
    return board;
  }

  let issues = board.issues;

  if (destinationColumnId && strays.length > 0) {
    // The server appended the moved issues after the destination's last
    // issue, one gap apart, in the order listed. Mirror that exactly.
    const straysById = new Map(strays.map((issue) => [issue.id, issue]));
    let position = Math.max(
      0,
      ...board.issues
        .filter((issue) => issue.columnId === destinationColumnId)
        .map((issue) => issue.position),
    );
    const relocated = new Map<string, Issue>();

    for (const issueId of movedIssueIds) {
      const issue = straysById.get(issueId);
      if (issue) {
        position += POSITION_GAP;
        relocated.set(issueId, {
          ...issue,
          columnId: destinationColumnId,
          position,
        });
      }
    }

    issues = board.issues.map((issue) => relocated.get(issue.id) ?? issue);
  }

  return {
    ...board,
    columns,
    // Anything still attached to the deleted column no longer exists.
    issues: issues
      .filter((issue) => issue.columnId !== columnId)
      .sort(byPosition),
  };
}

function withoutIssue(
  board: BoardDetail,
  payload: IssueDeletedPayload,
): BoardDetail {
  if (payload.boardId !== board.id) {
    return board;
  }

  const issues = board.issues.filter((issue) => issue.id !== payload.issueId);

  return issues.length === board.issues.length ? board : { ...board, issues };
}

export function applyBoardEvent(
  board: BoardDetail,
  event: BoardRoomEvent,
): BoardDetail {
  switch (event.type) {
    case "column:created":
    case "column:updated":
      return withColumn(board, event.payload, []);
    case "column:moved":
      return withColumn(board, event.payload.column, event.payload.rebalanced);
    case "column:deleted":
      return withoutColumn(board, event.payload);
    case "issue:created":
    case "issue:updated":
      return withIssue(board, event.payload, []);
    case "issue:moved":
      return withIssue(board, event.payload.issue, event.payload.rebalanced);
    case "issue:deleted":
      return withoutIssue(board, event.payload);
  }
}

/** Applies a `board:updated` payload to a cached board or summary of the same board. */
export function mergeBoard<T extends Board>(current: T, incoming: Board): T {
  if (current.id !== incoming.id || current.updatedAt >= incoming.updatedAt) {
    return current;
  }

  return {
    ...current,
    title: incoming.title,
    description: incoming.description,
    updatedAt: incoming.updatedAt,
  };
}

/** Keeps a list entry's counts in step with the cached board detail. */
export function syncSummary(
  summary: BoardSummary,
  detail: BoardDetail,
): BoardSummary {
  const columnCount = detail.columns.length;
  const issueCount = detail.issues.length;

  return summary.columnCount === columnCount &&
    summary.issueCount === issueCount
    ? summary
    : { ...summary, columnCount, issueCount };
}

/** `list.map` that returns the original array when no entry changed. */
export function mapStable<T>(list: readonly T[], map: (item: T) => T): T[] {
  let changed = false;
  const next = list.map((item) => {
    const mapped = map(item);
    changed ||= mapped !== item;
    return mapped;
  });

  return changed ? next : (list as T[]);
}
