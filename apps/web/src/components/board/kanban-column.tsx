import { useSortable } from "@dnd-kit/react/sortable";
import { Add01Icon, DragDropVerticalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { BoardColumn, Issue } from "@huddle/shared";
import { useState } from "react";

import { ColumnMenu } from "@/components/board/column-menu";
import { IssueCard } from "@/components/board/issue-card";
import { IssueComposer } from "@/components/board/issue-composer";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Columns sit below cards in collision priority so a card dragged over a column
// header still targets the column, not the header text.
const COLUMN_COLLISION_PRIORITY = 1;

export function KanbanColumn({
  boardId,
  column,
  index,
  columnCount,
  columns,
  issues,
  onOpenIssue,
  onMoveIssueToColumn,
  onMoveColumn,
}: {
  boardId: string;
  column: BoardColumn;
  index: number;
  columnCount: number;
  columns: BoardColumn[];
  issues: Issue[];
  onOpenIssue: (issueId: string) => void;
  onMoveIssueToColumn: (issueId: string, columnId: string) => void;
  onMoveColumn: (direction: "left" | "right") => void;
}) {
  const [composerOpen, setComposerOpen] = useState(false);
  const { ref, handleRef, isDragSource, isDropTarget } = useSortable({
    id: column.id,
    index,
    type: "column",
    accept: ["column", "issue"],
    collisionPriority: COLUMN_COLLISION_PRIORITY,
  });

  const headingId = `column-${column.id}-heading`;

  return (
    <section
      ref={ref}
      aria-labelledby={headingId}
      className={cn(
        "flex max-h-full w-[85vw] shrink-0 snap-center flex-col rounded-2xl bg-secondary/70 transition-shadow sm:w-72",
        isDropTarget && !isDragSource && "ring-2 ring-primary/30",
        isDragSource && "opacity-60",
      )}
    >
      <header className="flex items-center gap-1 px-2 pt-2 pb-1">
        <button
          ref={handleRef}
          type="button"
          className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-background/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
          aria-label={`Reorder column ${column.name}`}
        >
          <HugeiconsIcon
            icon={DragDropVerticalIcon}
            size={16}
            strokeWidth={1.5}
          />
        </button>
        <h2 id={headingId} className="min-w-0 truncate text-sm font-semibold">
          {column.name}
        </h2>
        <span
          className="rounded-md bg-background/80 px-1.5 text-xs font-medium text-muted-foreground tabular-nums"
          aria-label={`${issues.length} issues`}
        >
          {issues.length}
        </span>
        <div className="ml-auto flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Add issue to ${column.name}`}
                onClick={() => setComposerOpen(true)}
              >
                <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.5} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add issue</TooltipContent>
          </Tooltip>
          <ColumnMenu
            boardId={boardId}
            column={column}
            columns={columns}
            issueCount={issues.length}
            canMoveLeft={index > 0}
            canMoveRight={index < columnCount - 1}
            onMove={onMoveColumn}
          />
        </div>
      </header>

      <div className="flex min-h-12 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-1">
        {issues.map((issue, issueIndex) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            index={issueIndex}
            columnId={column.id}
            columns={columns}
            onOpen={onOpenIssue}
            onMoveToColumn={onMoveIssueToColumn}
          />
        ))}
        {issues.length === 0 && !composerOpen ? (
          <p className="rounded-xl border border-dashed border-border/80 px-3 py-5 text-center text-xs text-muted-foreground">
            Nothing here yet. Drop a card or add an issue.
          </p>
        ) : null}
      </div>

      <div className="p-2 pt-1">
        {composerOpen ? (
          <IssueComposer
            boardId={boardId}
            columnId={column.id}
            columnName={column.name}
            onClose={() => setComposerOpen(false)}
          />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:bg-background/70"
            onClick={() => setComposerOpen(true)}
          >
            <HugeiconsIcon
              icon={Add01Icon}
              size={16}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            Add issue
          </Button>
        )}
      </div>
    </section>
  );
}
