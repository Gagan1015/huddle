import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Delete02Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { BoardColumn } from "@huddle/shared";
import { useState } from "react";

import { DeleteColumnDialog } from "@/components/board/delete-column-dialog";
import { RenameColumnDialog } from "@/components/board/rename-column-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ColumnMenu({
  boardId,
  column,
  columns,
  issueCount,
  canMoveLeft,
  canMoveRight,
  onMove,
}: {
  boardId: string;
  column: BoardColumn;
  columns: BoardColumn[];
  issueCount: number;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMove: (direction: "left" | "right") => void;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Column options for ${column.name}`}
          >
            <HugeiconsIcon
              icon={MoreHorizontalIcon}
              size={16}
              strokeWidth={1.5}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
            <HugeiconsIcon
              icon={PencilEdit02Icon}
              size={16}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canMoveLeft}
            onSelect={() => onMove("left")}
          >
            <HugeiconsIcon
              icon={ArrowLeft01Icon}
              size={16}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            Move left
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canMoveRight}
            onSelect={() => onMove("right")}
          >
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={16}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            Move right
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={columns.length <= 1}
            onSelect={() => setDeleteOpen(true)}
          >
            <HugeiconsIcon
              icon={Delete02Icon}
              size={16}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            Delete column
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameColumnDialog
        boardId={boardId}
        column={column}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />
      <DeleteColumnDialog
        boardId={boardId}
        column={column}
        columns={columns}
        issueCount={issueCount}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
