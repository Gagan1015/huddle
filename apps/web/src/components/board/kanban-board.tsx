import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import type { BoardDetail, Issue } from "@huddle/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AddColumn } from "@/components/board/add-column";
import { BoardPeopleProvider } from "@/components/board/board-people";
import { ImportActivity } from "@/components/board/import-activity";
import {
  APPEND_INDEX,
  buildLayout,
  indexById,
  locateIssue,
  markDragEnded,
  type BoardLayout,
} from "@/components/board/board-model";
import { IssueSheet } from "@/components/board/issue-sheet";
import { KanbanColumn } from "@/components/board/kanban-column";
import { useMoveColumn, useMoveIssue } from "@/features/boards";
import { errorMessage } from "@/lib/api";

export function KanbanBoard({
  board,
  currentUserId,
}: {
  board: BoardDetail;
  currentUserId: string;
}) {
  const [layout, setLayout] = useState<BoardLayout>(() => buildLayout(board));
  const [isDragging, setIsDragging] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const lastSyncedRef = useRef<BoardDetail | null>(null);

  const moveIssue = useMoveIssue(board.id);
  const moveColumn = useMoveColumn(board.id);

  const columnsById = useMemo(() => indexById(board.columns), [board.columns]);
  const issuesById = useMemo(() => indexById(board.issues), [board.issues]);
  const serverLayout = useMemo(() => buildLayout(board), [board]);

  // Render from a local snapshot during a drag and while the resulting move is
  // in flight, so a remote event landing mid-gesture cannot snap the card back.
  // Fresh server data is adopted once the hold ends.
  const holdLayout = isDragging || moveIssue.isPending || moveColumn.isPending;

  useEffect(() => {
    if (holdLayout || lastSyncedRef.current === board) {
      return;
    }
    lastSyncedRef.current = board;
    setLayout(buildLayout(board));
  }, [board, holdLayout]);

  const resetLayout = () => setLayout(buildLayout(board));

  const failMove = (error: unknown) => {
    toast.error(errorMessage(error, "That move did not save."));
    resetLayout();
  };

  const requestIssueMove = (
    issueId: string,
    columnId: string,
    index: number,
  ) => {
    moveIssue.mutate({ issueId, columnId, index }, { onError: failMove });
  };

  const requestColumnMove = (columnId: string, index: number) => {
    moveColumn.mutate({ columnId, index }, { onError: failMove });
  };

  const orderedColumns = layout.columnOrder
    .map((columnId) => columnsById.get(columnId))
    .filter((column) => column !== undefined);

  const selectedIssue = selectedIssueId
    ? (issuesById.get(selectedIssueId) ?? null)
    : null;

  return (
    <BoardPeopleProvider organizationId={board.organizationId}>
      <DragDropProvider
        onDragStart={() => setIsDragging(true)}
        onDragOver={(event) => {
          const { source } = event.operation;
          if (!source || source.type !== "issue") {
            return;
          }
          setLayout((current) => ({
            ...current,
            items: move(current.items, event),
          }));
        }}
        onDragEnd={(event) => {
          setIsDragging(false);
          markDragEnded();
          const { source } = event.operation;

          if (!source) {
            return;
          }

          if (event.canceled) {
            resetLayout();
            return;
          }

          if (source.type === "column") {
            const columnId = String(source.id);
            const nextOrder = move(layoutRef.current.columnOrder, event);
            const index = nextOrder.indexOf(columnId);
            setLayout((current) => ({ ...current, columnOrder: nextOrder }));

            if (
              index !== -1 &&
              index !== serverLayout.columnOrder.indexOf(columnId)
            ) {
              requestColumnMove(columnId, index);
            }
            return;
          }

          const issueId = String(source.id);
          const placed = locateIssue(layoutRef.current.items, issueId);
          const origin = locateIssue(serverLayout.items, issueId);

          if (!placed || !origin) {
            return;
          }

          if (
            placed.columnId !== origin.columnId ||
            placed.index !== origin.index
          ) {
            requestIssueMove(issueId, placed.columnId, placed.index);
          }
        }}
      >
        <div className="flex h-full min-h-0 snap-x snap-mandatory items-start gap-4 overflow-x-auto px-4 py-4 sm:px-6 lg:snap-none">
          {orderedColumns.map((column, index) => (
            <KanbanColumn
              key={column.id}
              boardId={board.id}
              column={column}
              index={index}
              columnCount={orderedColumns.length}
              columns={orderedColumns}
              issues={(layout.items[column.id] ?? [])
                .map((issueId) => issuesById.get(issueId))
                .filter((issue): issue is Issue => issue !== undefined)}
              onOpenIssue={setSelectedIssueId}
              onMoveIssueToColumn={(issueId, columnId) =>
                requestIssueMove(issueId, columnId, APPEND_INDEX)
              }
              onMoveColumn={(direction) =>
                requestColumnMove(
                  column.id,
                  direction === "left" ? index - 1 : index + 1,
                )
              }
            />
          ))}
          <AddColumn boardId={board.id} />
        </div>
      </DragDropProvider>

      <ImportActivity boardId={board.id} currentUserId={currentUserId} />

      <IssueSheet
        boardId={board.id}
        issue={selectedIssue}
        columns={orderedColumns}
        open={selectedIssue !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedIssueId(null);
          }
        }}
      />
    </BoardPeopleProvider>
  );
}
