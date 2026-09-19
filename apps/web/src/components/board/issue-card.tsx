import { PointerSensor } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import {
  ArrowDataTransferHorizontalIcon,
  Delete02Icon,
  MoreHorizontalIcon,
  SparklesIcon,
  Tick02Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { BoardColumn, Issue } from "@huddle/shared";
import { useState } from "react";
import { toast } from "sonner";

import { dragEndedRecently } from "@/components/board/board-model";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteIssue } from "@/features/boards";
import { errorMessage } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

// Pointer drags may begin anywhere on the card except its menu; keyboard users
// move cards through the menu instead of the keyboard sensor so Enter opens
// the card as expected.
const cardSensors = [
  PointerSensor.configure({
    preventActivation: (event) =>
      event.target instanceof Element &&
      event.target.closest("[data-no-drag]") !== null,
  }),
];

export function IssueCard({
  issue,
  index,
  columnId,
  columns,
  onOpen,
  onMoveToColumn,
}: {
  issue: Issue;
  index: number;
  columnId: string;
  columns: BoardColumn[];
  onOpen: (issueId: string) => void;
  onMoveToColumn: (issueId: string, columnId: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteIssue = useDeleteIssue(issue.boardId);
  const { ref, isDragSource } = useSortable({
    id: issue.id,
    index,
    type: "issue",
    accept: "issue",
    group: columnId,
    sensors: cardSensors,
  });

  const open = () => {
    if (!dragEndedRecently()) {
      onOpen(issue.id);
    }
  };

  return (
    <article
      ref={ref}
      className={cn(
        "group/card relative rounded-xl border border-border bg-card shadow-xs transition-shadow",
        isDragSource &&
          "z-10 shadow-lg ring-1 ring-primary/30 motion-safe:rotate-1",
      )}
    >
      <button
        type="button"
        onClick={open}
        className="block w-full rounded-xl p-3 pr-9 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Open issue: ${issue.title}`}
      >
        <span className="block text-sm leading-5 font-medium">
          {issue.title}
        </span>
        {issue.description ? (
          <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">
            {issue.description}
          </span>
        ) : null}
        <span className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          {issue.source === "AI_IMPORT" ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 font-medium text-accent-foreground">
              <HugeiconsIcon
                icon={SparklesIcon}
                size={12}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              From notes
            </span>
          ) : null}
          <span className="ml-auto">{formatRelativeTime(issue.createdAt)}</span>
        </span>
      </button>

      <div
        data-no-drag
        className="absolute top-1.5 right-1.5 opacity-0 transition-opacity group-focus-within/card:opacity-100 group-hover/card:opacity-100 has-aria-expanded:opacity-100"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Actions for ${issue.title}`}
            >
              <HugeiconsIcon
                icon={MoreHorizontalIcon}
                size={14}
                strokeWidth={1.5}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={() => onOpen(issue.id)}>
              <HugeiconsIcon
                icon={ViewIcon}
                size={16}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              Open
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <HugeiconsIcon
                  icon={ArrowDataTransferHorizontalIcon}
                  size={16}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                Move to
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                {columns.map((column) => (
                  <DropdownMenuItem
                    key={column.id}
                    disabled={column.id === columnId}
                    onSelect={() => onMoveToColumn(issue.id, column.id)}
                  >
                    <span className="flex-1 truncate">{column.name}</span>
                    {column.id === columnId ? (
                      <HugeiconsIcon
                        icon={Tick02Icon}
                        size={16}
                        strokeWidth={2}
                        aria-label="Current column"
                      />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setConfirmDelete(true)}
            >
              <HugeiconsIcon
                icon={Delete02Icon}
                size={16}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this issue?"
        description={`“${issue.title}” will be removed from the board. This cannot be undone.`}
        confirmLabel="Delete issue"
        destructive
        pending={deleteIssue.isPending}
        onConfirm={() =>
          deleteIssue.mutate(issue.id, {
            onSuccess: () => {
              setConfirmDelete(false);
              toast.success("Issue deleted.");
            },
            onError: (error) => toast.error(errorMessage(error)),
          })
        }
      />
    </article>
  );
}
