import {
  boardRoomPayloadSchema,
  SOCKET_UNAUTHENTICATED,
  type SocketAck,
  type UserSummary,
} from "@huddle/shared";
import type { IncomingHttpHeaders } from "node:http";

import { HttpError } from "../lib/http-error.js";
import type { PresenceChange, PresenceRegistry } from "./presence.js";
import {
  boardRoom,
  isBoardRoomFor,
  organizationRoom,
  type BoardScope,
} from "./rooms.js";
import type { SocketData } from "./types.js";

// Everything that touches the session store, database, or transport is
// injected so these handlers can be exercised without booting Prisma,
// Better Auth, or Socket.IO.
export interface RealtimeDeps {
  presence: PresenceRegistry;
  resolveUser(headers: IncomingHttpHeaders): Promise<UserSummary | null>;
  listOrganizationIds(userId: string): Promise<string[]>;
  /** Returns the board's scope when the user may access it; throws HttpError otherwise. */
  authorizeBoard(userId: string, boardId: string): Promise<BoardScope>;
  /** Sends the room its current viewer list, optionally skipping the socket that just left. */
  broadcastPresence(change: PresenceChange, exceptSocketId?: string): void;
  onError(error: unknown, context: string): void;
}

export interface HandshakeSocket {
  request: { headers: IncomingHttpHeaders };
  data: Partial<SocketData>;
}

export interface RoomSocket {
  id: string;
  data: SocketData;
  rooms: Set<string>;
  join(room: string): void | Promise<void>;
  leave(room: string): void | Promise<void>;
}

/** `connect_error` message for failures that are not the client's fault; the client keeps retrying. */
export const SOCKET_UNAVAILABLE = "UNAVAILABLE";

export function createConnectionGate(deps: RealtimeDeps) {
  return async (socket: HandshakeSocket, next: (error?: Error) => void) => {
    try {
      const user = await deps.resolveUser(socket.request.headers);

      if (!user) {
        next(new Error(SOCKET_UNAUTHENTICATED));
        return;
      }

      socket.data.user = user;
      socket.data.organizationIds = await deps.listOrganizationIds(user.id);
      next();
    } catch (error) {
      deps.onError(error, "socket handshake");
      next(new Error(SOCKET_UNAVAILABLE));
    }
  };
}

// Organization rooms are joined synchronously on connection so board lifecycle
// events cannot slip past between the handshake and the first event handler.
export function joinOrganizationRooms(socket: RoomSocket) {
  for (const organizationId of socket.data.organizationIds) {
    void socket.join(organizationRoom(organizationId));
  }
}

function ackFromError(error: unknown): SocketAck {
  if (error instanceof HttpError) {
    return { ok: false, code: error.code, message: error.message };
  }

  return {
    ok: false,
    code: "INTERNAL_ERROR",
    message: "Live updates are unavailable right now.",
  };
}

export async function handleBoardJoin(
  socket: RoomSocket,
  deps: RealtimeDeps,
  payload: unknown,
): Promise<SocketAck> {
  const parsed = boardRoomPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "The board subscription request is invalid.",
    };
  }

  try {
    const scope = await deps.authorizeBoard(
      socket.data.user.id,
      parsed.data.boardId,
    );
    await socket.join(boardRoom(scope));
    // The joiner is included so their own header shows who else is here.
    deps.broadcastPresence(
      deps.presence.join(scope, socket.id, socket.data.user),
    );
    return { ok: true };
  } catch (error) {
    if (!(error instanceof HttpError)) {
      deps.onError(error, "board:join");
    }
    return ackFromError(error);
  }
}

export async function handleBoardLeave(
  socket: RoomSocket,
  deps: RealtimeDeps,
  payload: unknown,
) {
  const parsed = boardRoomPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    return;
  }

  for (const room of socket.rooms) {
    if (isBoardRoomFor(room, parsed.data.boardId)) {
      await socket.leave(room);
    }
  }

  const change = deps.presence.leave(parsed.data.boardId, socket.id);

  if (change) {
    deps.broadcastPresence(change, socket.id);
  }
}

// Runs on `disconnecting`, while the socket is still in its rooms.
export function handleDisconnect(socket: RoomSocket, deps: RealtimeDeps) {
  for (const change of deps.presence.leaveAll(socket.id)) {
    deps.broadcastPresence(change, socket.id);
  }
}
