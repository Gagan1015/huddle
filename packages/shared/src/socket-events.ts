import type { Board, BoardDeletedPayload } from "./boards.js";
import type { BoardColumn, ColumnDeletedPayload } from "./columns.js";
import type { Issue, IssueDeletedPayload } from "./issues.js";

export interface ServerToClientEvents {
  "board:created": (board: Board) => void;
  "board:updated": (board: Board) => void;
  "board:deleted": (payload: BoardDeletedPayload) => void;
  "column:created": (column: BoardColumn) => void;
  "column:updated": (column: BoardColumn) => void;
  "column:moved": (column: BoardColumn) => void;
  "column:deleted": (payload: ColumnDeletedPayload) => void;
  "issue:created": (issue: Issue) => void;
  "issue:updated": (issue: Issue) => void;
  "issue:moved": (issue: Issue) => void;
  "issue:deleted": (payload: IssueDeletedPayload) => void;
  "import:started": (payload: { boardId: string; importId: string }) => void;
  "import:card": (payload: { importId: string; issue: Issue }) => void;
  "import:done": (payload: { importId: string; total: number }) => void;
  "import:failed": (payload: { importId: string; message: string }) => void;
}

export interface ClientToServerEvents {
  "board:join": (payload: { boardId: string }) => void;
  "board:leave": (payload: { boardId: string }) => void;
}

export type ServerEventName = keyof ServerToClientEvents;
export type ServerEventPayload<E extends ServerEventName> = Parameters<
  ServerToClientEvents[E]
>[0];
