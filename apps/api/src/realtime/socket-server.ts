import type { Server as HttpServer } from "node:http";

import { Server } from "socket.io";

import { requireBoardAccess } from "../auth/authorization.js";
import { resolveSession } from "../auth/session.js";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { logger } from "../lib/logger.js";
import { toUserSummary } from "../lib/serializers.js";
import {
  createConnectionGate,
  handleBoardJoin,
  handleBoardLeave,
  handleDisconnect,
  joinOrganizationRooms,
  type RealtimeDeps,
} from "./handlers.js";
import { PresenceRegistry } from "./presence.js";
import { boardRoom, boardScope } from "./rooms.js";
import type { RealtimeServer } from "./types.js";

function createDeps(io: RealtimeServer): RealtimeDeps {
  return {
    presence: new PresenceRegistry(),
    resolveUser: async (headers) => {
      const session = await resolveSession(headers);
      return session
        ? toUserSummary({
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            image: session.user.image ?? null,
          })
        : null;
    },
    listOrganizationIds: async (userId) => {
      const memberships = await prisma.member.findMany({
        where: { userId },
        select: { organizationId: true },
      });
      return memberships.map((membership) => membership.organizationId);
    },
    authorizeBoard: async (userId, boardId) =>
      boardScope(await requireBoardAccess(userId, boardId)),
    broadcastPresence: ({ scope, users }, exceptSocketId) => {
      const room = io.to(boardRoom(scope));
      const target = exceptSocketId ? room.except(exceptSocketId) : room;
      target.emit("presence:updated", { boardId: scope.boardId, users });
    },
    onError: (error, context) =>
      logger.error({ err: error, context }, "Realtime error"),
  };
}

export function createRealtimeServer(httpServer: HttpServer): RealtimeServer {
  const io: RealtimeServer = new Server(httpServer, {
    cors: {
      credentials: true,
      origin: env.WEB_ORIGIN,
    },
  });
  const deps = createDeps(io);

  io.use(createConnectionGate(deps));

  io.on("connection", (socket) => {
    joinOrganizationRooms(socket);

    socket.on("board:join", (payload, ack) => {
      void handleBoardJoin(socket, deps, payload).then((result) => {
        if (typeof ack === "function") {
          ack(result);
        }
      });
    });

    socket.on("board:leave", (payload) => {
      void handleBoardLeave(socket, deps, payload).catch((error: unknown) =>
        deps.onError(error, "board:leave"),
      );
    });

    // `disconnecting` still has the socket in its rooms; `disconnect` does not.
    socket.on("disconnecting", () => handleDisconnect(socket, deps));
  });

  return io;
}
