import type {
  ImportCardPayload,
  ImportDonePayload,
  ImportFailedPayload,
  ImportNotesInput,
  ImportResult,
  ImportStartedPayload,
} from "@huddle/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import {
  IDLE_IMPORT,
  reduceImportActivity,
  type ImportActivity,
  type ImportEvent,
} from "@/features/import-activity";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { getSocket, isRealtimeConnected } from "@/lib/socket";

// Connected clients receive every created issue over `import:card` and fold it
// into the board like `issue:created`; the REST result is never applied a
// second time. Without a live socket, refetch so REST stays authoritative.
export function useImportNotes(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ImportNotesInput) =>
      apiFetch<ImportResult>(`/api/boards/${boardId}/imports/meeting-notes`, {
        method: "POST",
        json: input,
      }),
    onSuccess: () =>
      isRealtimeConnected()
        ? undefined
        : Promise.all([
            queryClient.invalidateQueries({
              queryKey: queryKeys.board(boardId),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.organizations,
            }),
          ]),
  });
}

const DONE_VISIBLE_MS = 4_000;
const FAILED_VISIBLE_MS = 8_000;

// Import progress for one board as seen by every viewer, driven purely by
// socket events so the initiating tab and teammates see the same thing.
export function useImportActivity(boardId: string): ImportActivity {
  const [activity, setActivity] = useState<ImportActivity>(IDLE_IMPORT);

  useEffect(() => {
    if (!boardId) {
      return;
    }

    const socket = getSocket();
    const apply = (event: ImportEvent) =>
      setActivity((current) => reduceImportActivity(current, event, boardId));

    const onStarted = (payload: ImportStartedPayload) =>
      apply({ type: "import:started", payload });
    const onCard = (payload: ImportCardPayload) =>
      apply({ type: "import:card", payload });
    const onDone = (payload: ImportDonePayload) =>
      apply({ type: "import:done", payload });
    const onFailed = (payload: ImportFailedPayload) =>
      apply({ type: "import:failed", payload });
    // Progress cannot be trusted across a gap; the board refetches on rejoin.
    const onDisconnect = () => setActivity(IDLE_IMPORT);

    socket.on("import:started", onStarted);
    socket.on("import:card", onCard);
    socket.on("import:done", onDone);
    socket.on("import:failed", onFailed);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("import:started", onStarted);
      socket.off("import:card", onCard);
      socket.off("import:done", onDone);
      socket.off("import:failed", onFailed);
      socket.off("disconnect", onDisconnect);
      setActivity(IDLE_IMPORT);
    };
  }, [boardId]);

  // Summaries clear themselves; failures linger a little longer to be read.
  useEffect(() => {
    if (activity.phase !== "done" && activity.phase !== "failed") {
      return;
    }

    const timer = setTimeout(
      () =>
        setActivity((current) =>
          current === activity ? IDLE_IMPORT : current,
        ),
      activity.phase === "done" ? DONE_VISIBLE_MS : FAILED_VISIBLE_MS,
    );

    return () => clearTimeout(timer);
  }, [activity]);

  return activity;
}
