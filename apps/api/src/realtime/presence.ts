import type { UserSummary } from "@huddle/shared";

import type { BoardScope } from "./rooms.js";

export interface PresenceChange {
  scope: BoardScope;
  users: UserSummary[];
}

interface BoardPresence {
  scope: BoardScope;
  /** Socket ID to the user behind it; several tabs of one user are separate entries. */
  sockets: Map<string, UserSummary>;
}

// In-memory record of which sockets have each board open, for a single API
// process. Users are reported once no matter how many tabs they have, in the
// order they first arrived. A multi-node deployment would move this into the
// Socket.IO adapter or a shared store.
export class PresenceRegistry {
  private readonly boards = new Map<string, BoardPresence>();

  join(scope: BoardScope, socketId: string, user: UserSummary): PresenceChange {
    let board = this.boards.get(scope.boardId);

    if (!board) {
      board = { scope, sockets: new Map() };
      this.boards.set(scope.boardId, board);
    }

    board.sockets.set(socketId, user);

    return { scope, users: this.list(scope.boardId) };
  }

  leave(boardId: string, socketId: string): PresenceChange | null {
    const board = this.boards.get(boardId);

    if (!board?.sockets.delete(socketId)) {
      return null;
    }

    if (board.sockets.size === 0) {
      this.boards.delete(boardId);
    }

    return { scope: board.scope, users: this.list(boardId) };
  }

  leaveAll(socketId: string): PresenceChange[] {
    const changes: PresenceChange[] = [];

    for (const boardId of [...this.boards.keys()]) {
      const change = this.leave(boardId, socketId);
      if (change) {
        changes.push(change);
      }
    }

    return changes;
  }

  list(boardId: string): UserSummary[] {
    const board = this.boards.get(boardId);

    if (!board) {
      return [];
    }

    const byUser = new Map<string, UserSummary>();

    for (const user of board.sockets.values()) {
      if (!byUser.has(user.id)) {
        byUser.set(user.id, user);
      }
    }

    return [...byUser.values()];
  }
}
