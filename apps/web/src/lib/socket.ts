import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@huddle/shared";
import { io, type Socket } from "socket.io-client";

import { API_BASE } from "@/lib/api";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

// One socket per tab. It is connected only while a session exists; see
// RealtimeProvider, which owns connect/disconnect.
export function getSocket(): AppSocket {
  if (!socket) {
    const options = { autoConnect: false, withCredentials: true };
    socket = API_BASE ? io(API_BASE, options) : io(options);
  }

  return socket;
}

export function isRealtimeConnected() {
  return socket?.connected ?? false;
}
