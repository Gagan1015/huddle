import {
  SOCKET_UNAUTHENTICATED,
  type Board,
  type BoardDeletedPayload,
  type BoardDetail,
  type BoardPresencePayload,
  type BoardRoomEvent,
  type BoardSummary,
  type ColumnDeletedPayload,
  type ColumnMovedPayload,
  type ImportCardPayload,
  type IssueDeletedPayload,
  type IssueMovedPayload,
  type UserSummary,
} from "@huddle/shared";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  applyBoardEvent,
  mapStable,
  mergeBoard,
  syncSummary,
} from "@/features/board-events";
import { queryKeys } from "@/lib/query-keys";
import { getSocket, type AppSocket } from "@/lib/socket";

export type RealtimeStatus =
  "connecting" | "connected" | "reconnecting" | "offline";

const RealtimeContext = createContext<RealtimeStatus | null>(null);

// Socket events are the only path that writes board data into the cache after
// a mutation; REST responses are never applied a second time.
function bindCacheReconciler(socket: AppSocket, queryClient: QueryClient) {
  const applyToBoard = (boardId: string, event: BoardRoomEvent) => {
    const key = queryKeys.board(boardId);
    const current = queryClient.getQueryData<BoardDetail>(key);

    if (!current) {
      return;
    }

    const next = applyBoardEvent(current, event);

    if (next === current) {
      return;
    }

    queryClient.setQueryData(key, next);
    queryClient.setQueryData<BoardSummary[]>(
      queryKeys.boards(next.organizationId),
      (list) =>
        list &&
        mapStable(list, (summary) =>
          summary.id === next.id ? syncSummary(summary, next) : summary,
        ),
    );
  };

  const onBoardCreated = (created: Board) => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.boards(created.organizationId),
    });
  };

  const onBoardUpdated = (updated: Board) => {
    queryClient.setQueryData<BoardDetail>(
      queryKeys.board(updated.id),
      (current) => current && mergeBoard(current, updated),
    );
    queryClient.setQueryData<BoardSummary[]>(
      queryKeys.boards(updated.organizationId),
      (list) =>
        list && mapStable(list, (summary) => mergeBoard(summary, updated)),
    );
  };

  const onBoardDeleted = ({ organizationId, boardId }: BoardDeletedPayload) => {
    queryClient.setQueryData<BoardSummary[]>(
      queryKeys.boards(organizationId),
      (list) =>
        list?.some((summary) => summary.id === boardId)
          ? list.filter((summary) => summary.id !== boardId)
          : list,
    );
    // Anyone viewing the board refetches, gets a 404, and sees the
    // "not available" state; cached copies nobody is watching are dropped.
    queryClient.removeQueries({
      queryKey: queryKeys.board(boardId),
      exact: true,
      type: "inactive",
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.board(boardId),
      exact: true,
      refetchType: "active",
    });
  };

  const onColumnCreated = (payload: BoardDetail["columns"][number]) =>
    applyToBoard(payload.boardId, { type: "column:created", payload });
  const onColumnUpdated = (payload: BoardDetail["columns"][number]) =>
    applyToBoard(payload.boardId, { type: "column:updated", payload });
  const onColumnMoved = (payload: ColumnMovedPayload) =>
    applyToBoard(payload.column.boardId, { type: "column:moved", payload });
  const onColumnDeleted = (payload: ColumnDeletedPayload) =>
    applyToBoard(payload.boardId, { type: "column:deleted", payload });
  const onIssueCreated = (payload: BoardDetail["issues"][number]) =>
    applyToBoard(payload.boardId, { type: "issue:created", payload });
  const onIssueUpdated = (payload: BoardDetail["issues"][number]) =>
    applyToBoard(payload.boardId, { type: "issue:updated", payload });
  const onIssueMoved = (payload: IssueMovedPayload) =>
    applyToBoard(payload.issue.boardId, { type: "issue:moved", payload });
  const onIssueDeleted = (payload: IssueDeletedPayload) =>
    applyToBoard(payload.boardId, { type: "issue:deleted", payload });
  // An imported card is a committed issue like any other; the import ID only
  // matters to the progress UI.
  const onImportCard = ({ issue }: ImportCardPayload) =>
    applyToBoard(issue.boardId, { type: "issue:created", payload: issue });

  socket.on("board:created", onBoardCreated);
  socket.on("board:updated", onBoardUpdated);
  socket.on("board:deleted", onBoardDeleted);
  socket.on("column:created", onColumnCreated);
  socket.on("column:updated", onColumnUpdated);
  socket.on("column:moved", onColumnMoved);
  socket.on("column:deleted", onColumnDeleted);
  socket.on("issue:created", onIssueCreated);
  socket.on("issue:updated", onIssueUpdated);
  socket.on("issue:moved", onIssueMoved);
  socket.on("issue:deleted", onIssueDeleted);
  socket.on("import:card", onImportCard);

  return () => {
    socket.off("board:created", onBoardCreated);
    socket.off("board:updated", onBoardUpdated);
    socket.off("board:deleted", onBoardDeleted);
    socket.off("column:created", onColumnCreated);
    socket.off("column:updated", onColumnUpdated);
    socket.off("column:moved", onColumnMoved);
    socket.off("column:deleted", onColumnDeleted);
    socket.off("issue:created", onIssueCreated);
    socket.off("issue:updated", onIssueUpdated);
    socket.off("issue:moved", onIssueMoved);
    socket.off("issue:deleted", onIssueDeleted);
    socket.off("import:card", onImportCard);
  };
}

// Mounted once a session exists. Owns the socket lifecycle and exposes the
// connection state for the indicator in the shell header.
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RealtimeStatus>(() =>
    getSocket().connected ? "connected" : "connecting",
  );

  useEffect(() => {
    const socket = getSocket();
    let hadConnected = socket.connected;

    const onConnect = () => {
      setStatus("connected");
      if (hadConnected) {
        // Board rooms catch up when they re-join; lists have no join step,
        // so refresh them here in case a board changed while offline.
        void queryClient.invalidateQueries({
          queryKey: queryKeys.organizations,
        });
      }
      hadConnected = true;
    };

    const onDisconnect = (reason: string) => {
      setStatus(reason === "io client disconnect" ? "offline" : "reconnecting");
    };

    const onConnectError = (error: Error) => {
      if (error.message === SOCKET_UNAUTHENTICATED) {
        // The session is gone; let the `me` query send the user to sign-in
        // instead of retrying forever.
        socket.disconnect();
        setStatus("offline");
        void queryClient.invalidateQueries({ queryKey: queryKeys.me });
        return;
      }
      setStatus("reconnecting");
    };

    const unbind = bindCacheReconciler(socket, queryClient);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      unbind();
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.disconnect();
    };
  }, [queryClient]);

  return (
    <RealtimeContext.Provider value={status}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeStatus(): RealtimeStatus {
  const status = useContext(RealtimeContext);

  if (status === null) {
    throw new Error("useRealtimeStatus must be used inside RealtimeProvider.");
  }

  return status;
}

// Subscribes the tab to one board while it is on screen and returns who else
// has it open. Every successful join (first load and each reconnect) refetches
// the board so nothing emitted before the room membership took effect is
// missed; the server answers each join with a fresh presence list.
export function useBoardRoom(boardId: string): UserSummary[] {
  const queryClient = useQueryClient();
  const [presence, setPresence] = useState<UserSummary[]>([]);

  useEffect(() => {
    if (!boardId) {
      return;
    }

    const socket = getSocket();
    let active = true;

    const join = () => {
      socket.emit("board:join", { boardId }, (result) => {
        if (!active) {
          return;
        }
        if (result.ok || result.code === "BOARD_NOT_FOUND") {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.board(boardId),
            exact: true,
          });
        }
      });
    };

    const onPresence = (payload: BoardPresencePayload) => {
      if (payload.boardId === boardId) {
        setPresence(payload.users);
      }
    };

    // Nobody can be confirmed present while the connection is down.
    const onDisconnect = () => setPresence([]);

    if (socket.connected) {
      join();
    }
    socket.on("connect", join);
    socket.on("presence:updated", onPresence);
    socket.on("disconnect", onDisconnect);

    return () => {
      active = false;
      socket.off("connect", join);
      socket.off("presence:updated", onPresence);
      socket.off("disconnect", onDisconnect);
      setPresence([]);
      if (socket.connected) {
        socket.emit("board:leave", { boardId });
      }
    };
  }, [boardId, queryClient]);

  return presence;
}
