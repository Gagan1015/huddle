import { z } from "zod";

import type { Board, BoardDeletedPayload } from "./boards.js";
import type {
  BoardColumn,
  ColumnDeletedPayload,
  ColumnMovedPayload,
} from "./columns.js";
import { idSchema } from "./common.js";
import { apiErrorCodeSchema } from "./errors.js";
import type {
  ImportCardPayload,
  ImportDonePayload,
  ImportFailedPayload,
  ImportStartedPayload,
} from "./imports.js";
import type {
  Issue,
  IssueDeletedPayload,
  IssueMovedPayload,
} from "./issues.js";
import { userSummarySchema } from "./users.js";

// Everyone who currently has the board open, one entry per user even when
// they have several tabs. Sent to the board room whenever that set changes.
export const boardPresencePayloadSchema = z.object({
  boardId: idSchema,
  users: z.array(userSummarySchema),
});

export type BoardPresencePayload = z.infer<typeof boardPresencePayloadSchema>;

// Board-scoped events reach the `board:<id>` room; board lifecycle events reach
// every member through the `organization:<id>` room.
export interface ServerToClientEvents {
  "board:created": (board: Board) => void;
  "board:updated": (board: Board) => void;
  "board:deleted": (payload: BoardDeletedPayload) => void;
  "column:created": (column: BoardColumn) => void;
  "column:updated": (column: BoardColumn) => void;
  "column:moved": (payload: ColumnMovedPayload) => void;
  "column:deleted": (payload: ColumnDeletedPayload) => void;
  "issue:created": (issue: Issue) => void;
  "issue:updated": (issue: Issue) => void;
  "issue:moved": (payload: IssueMovedPayload) => void;
  "issue:deleted": (payload: IssueDeletedPayload) => void;
  "presence:updated": (payload: BoardPresencePayload) => void;
  // Meeting-notes import lifecycle. `import:card` carries a committed issue and
  // is applied exactly like `issue:created`; the rest drive progress UI.
  "import:started": (payload: ImportStartedPayload) => void;
  "import:card": (payload: ImportCardPayload) => void;
  "import:done": (payload: ImportDonePayload) => void;
  "import:failed": (payload: ImportFailedPayload) => void;
}

// The server validates these payloads and authorizes the board before joining;
// clients never name rooms directly.
export const boardRoomPayloadSchema = z.object({
  boardId: idSchema,
});

export const socketAckSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true) }),
  z.object({
    ok: z.literal(false),
    code: apiErrorCodeSchema,
    message: z.string(),
  }),
]);

export type BoardRoomPayload = z.infer<typeof boardRoomPayloadSchema>;
export type SocketAck = z.infer<typeof socketAckSchema>;

export interface ClientToServerEvents {
  "board:join": (
    payload: BoardRoomPayload,
    ack: (result: SocketAck) => void,
  ) => void;
  "board:leave": (payload: BoardRoomPayload) => void;
}

/** `connect_error` message the server uses when the handshake has no session. */
export const SOCKET_UNAUTHENTICATED = "UNAUTHENTICATED";

export type ServerEventName = keyof ServerToClientEvents;
export type ServerEventPayload<E extends ServerEventName> = Parameters<
  ServerToClientEvents[E]
>[0];

// Events that mutate one board's columns or issues, tagged for reducers.
export type BoardRoomEvent = {
  [E in Extract<ServerEventName, `column:${string}` | `issue:${string}`>]: {
    type: E;
    payload: ServerEventPayload<E>;
  };
}[Extract<ServerEventName, `column:${string}` | `issue:${string}`>];
