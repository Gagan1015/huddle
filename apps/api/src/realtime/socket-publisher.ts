import type {
  ServerEventName,
  ServerEventPayload,
  ServerToClientEvents,
} from "@huddle/shared";

import type { BoardEventPublisher } from "./board-events.js";
import { boardRoom, organizationRoom } from "./rooms.js";
import type { RealtimeServer } from "./types.js";

export type RoomEmitter = Pick<RealtimeServer, "to">;

export function createSocketPublisher(io: RoomEmitter): BoardEventPublisher {
  const emit = <E extends ServerEventName>(
    room: string,
    event: E,
    payload: ServerEventPayload<E>,
  ) => {
    // Every server event takes exactly one argument; the cast bridges the
    // generic event name to Socket.IO's tuple-typed emit.
    io.to(room).emit(
      event,
      ...([payload] as Parameters<ServerToClientEvents[E]>),
    );
  };

  return {
    toBoard: (scope, event, payload) => emit(boardRoom(scope), event, payload),
    toOrganization: (organizationId, event, payload) =>
      emit(organizationRoom(organizationId), event, payload),
  };
}
