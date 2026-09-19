// Room names are derived only from server-authorized IDs. Clients ask to join a
// board by ID; the server resolves the organization and builds the room itself.

export interface BoardScope {
  organizationId: string;
  boardId: string;
}

export function boardScope(board: {
  id: string;
  organizationId: string;
}): BoardScope {
  return { organizationId: board.organizationId, boardId: board.id };
}

export function organizationRoom(organizationId: string) {
  return `org:${organizationId}`;
}

export function boardRoom(scope: BoardScope) {
  return `${organizationRoom(scope.organizationId)}:board:${scope.boardId}`;
}

export function isBoardRoomFor(room: string, boardId: string) {
  return room.endsWith(`:board:${boardId}`);
}
