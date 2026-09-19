import type { BoardColumn, Issue } from "./schemas.js";

export interface ServerToClientEvents {
  "column:created": (column: BoardColumn) => void;
  "column:updated": (column: BoardColumn) => void;
  "column:moved": (column: BoardColumn) => void;
  "column:deleted": (payload: { boardId: string; columnId: string }) => void;
  "issue:created": (issue: Issue) => void;
  "issue:updated": (issue: Issue) => void;
  "issue:moved": (issue: Issue) => void;
  "import:started": (payload: { boardId: string; importId: string }) => void;
  "import:card": (payload: { importId: string; issue: Issue }) => void;
  "import:done": (payload: { importId: string; total: number }) => void;
  "import:failed": (payload: { importId: string; message: string }) => void;
}

export interface ClientToServerEvents {
  "board:join": (payload: { boardId: string }) => void;
}
