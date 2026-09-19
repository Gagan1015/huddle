import type {
  ImportCardPayload,
  ImportDonePayload,
  ImportFailedPayload,
  ImportStartedPayload,
} from "@huddle/shared";

// Pure reducer for the import progress shown on a board. It folds the four
// `import:*` socket events into one small state, returns the same object when
// nothing changes, and copes with missed or duplicated events: a card can
// arrive without a start, a done can arrive twice, and a late card after the
// summary is ignored.

export type ImportActivity =
  | { phase: "idle" }
  | {
      phase: "extracting";
      importId: string;
      boardId: string;
      requestedById: string;
    }
  | {
      phase: "creating";
      importId: string;
      boardId: string;
      requestedById: string | null;
      received: number;
      total: number;
    }
  | { phase: "done"; importId: string; boardId: string; total: number }
  | { phase: "failed"; importId: string; boardId: string; message: string };

export type ImportEvent =
  | { type: "import:started"; payload: ImportStartedPayload }
  | { type: "import:card"; payload: ImportCardPayload }
  | { type: "import:done"; payload: ImportDonePayload }
  | { type: "import:failed"; payload: ImportFailedPayload };

export const IDLE_IMPORT: ImportActivity = { phase: "idle" };

type ActiveImport = Exclude<ImportActivity, { phase: "idle" }>;

function isInFlight(state: ImportActivity) {
  return state.phase === "extracting" || state.phase === "creating";
}

export function reduceImportActivity(
  state: ImportActivity,
  event: ImportEvent,
  boardId: string,
): ImportActivity {
  const { payload } = event;

  if (payload.boardId !== boardId) {
    return state;
  }

  // The state as it relates to this event's import, or null if it is about
  // a different import (or nothing is showing).
  const current: ActiveImport | null =
    state.phase !== "idle" && state.importId === payload.importId
      ? state
      : null;

  // Branches read `event.payload` so the discriminant narrows the payload type.
  switch (event.type) {
    case "import:started":
      if (current?.phase === "extracting") {
        return state;
      }
      return {
        phase: "extracting",
        importId: payload.importId,
        boardId,
        requestedById: event.payload.requestedById,
      };

    case "import:card": {
      if (current?.phase === "done" || current?.phase === "failed") {
        return state;
      }

      const { index, total } = event.payload;
      const requestedById =
        current?.phase === "extracting" || current?.phase === "creating"
          ? current.requestedById
          : null;
      const received =
        current?.phase === "creating"
          ? Math.max(current.received, index)
          : index;

      if (
        current?.phase === "creating" &&
        current.received === received &&
        current.total === total
      ) {
        return state;
      }

      return {
        phase: "creating",
        importId: payload.importId,
        boardId,
        requestedById,
        received,
        total,
      };
    }

    case "import:done":
      if (!current && isInFlight(state)) {
        // Another import is still being shown here; do not clobber it.
        return state;
      }
      if (current?.phase === "done") {
        return state;
      }
      return {
        phase: "done",
        importId: payload.importId,
        boardId,
        total: event.payload.total,
      };

    case "import:failed":
      if (!current && isInFlight(state)) {
        return state;
      }
      if (current?.phase === "failed") {
        return state;
      }
      return {
        phase: "failed",
        importId: payload.importId,
        boardId,
        message: event.payload.message,
      };
  }
}
