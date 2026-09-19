import type {
  ClientToServerEvents,
  ServerToClientEvents,
  UserSummary,
} from "@huddle/shared";
import type { DefaultEventsMap, Server, Socket } from "socket.io";

// Filled in by the handshake gate before any event handler runs.
export interface SocketData {
  user: UserSummary;
  organizationIds: string[];
}

export type RealtimeServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  DefaultEventsMap,
  SocketData
>;

export type RealtimeSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  DefaultEventsMap,
  SocketData
>;
