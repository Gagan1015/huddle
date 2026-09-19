import { zodResolver } from "@hookform/resolvers/zod";
import {
  Delete02Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { BoardDetail, UserSummary } from "@huddle/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { z } from "zod";

import { BoardPresence } from "@/components/board/board-presence";
import { ImportNotesDialog } from "@/components/board/import-notes-dialog";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { describedBy, FormField } from "@/components/common/form-field";
import { Spinner } from "@/components/common/page-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDeleteBoard, useUpdateBoard } from "@/features/boards";
import { publicConfigQueryOptions } from "@/features/session";
import { errorMessage } from "@/lib/api";

const boardFormSchema = z.object({
  title: z.string().trim().min(1, "Give the board a title.").max(191),
  description: z.string().trim().max(2000),
});

type BoardFormValues = z.infer<typeof boardFormSchema>;

export function BoardHeader({
  board,
  organizationName,
  presence,
  currentUserId,
}: {
  board: BoardDetail;
  organizationName: string;
  presence: UserSummary[];
  currentUserId: string;
}) {
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const updateBoard = useUpdateBoard(board.id);
  const deleteBoard = useDeleteBoard();
  const config = useQuery(publicConfigQueryOptions);
  // Assume the server can import until it says otherwise; it answers with a
  // clear error either way.
  const importEnabled = config.data?.features.meetingNotesImport ?? true;

  const form = useForm<BoardFormValues>({
    resolver: zodResolver(boardFormSchema),
    defaultValues: { title: board.title, description: board.description ?? "" },
  });

  useEffect(() => {
    if (editOpen) {
      form.reset({ title: board.title, description: board.description ?? "" });
    }
  }, [editOpen, board.title, board.description, form]);

  const titleError = form.formState.errors.title?.message;

  const save = form.handleSubmit((values) => {
    updateBoard.mutate(
      { title: values.title, description: values.description || null },
      {
        onSuccess: () => setEditOpen(false),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  });

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-1.5 text-sm"
      >
        <Link
          to={`/organizations/${board.organizationId}`}
          className="truncate rounded text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {organizationName}
        </Link>
        <span aria-hidden="true" className="text-muted-foreground/60">
          /
        </span>
        <h1 className="truncate font-semibold" aria-current="page">
          {board.title}
        </h1>
      </nav>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <BoardPresence users={presence} currentUserId={currentUserId} />
        {importEnabled ? (
          <Button size="sm" onClick={() => setImportOpen(true)}>
            <HugeiconsIcon
              icon={SparklesIcon}
              size={16}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Import notes</span>
            <span className="sr-only sm:hidden">Import notes</span>
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              {/* A disabled button emits no pointer events, so the wrapper carries the tooltip. */}
              <span
                tabIndex={0}
                className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Button size="sm" disabled>
                  <HugeiconsIcon
                    icon={SparklesIcon}
                    size={16}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <span className="hidden sm:inline">Import notes</span>
                  <span className="sr-only sm:hidden">Import notes</span>
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Add an Anthropic API key to the API to turn on meeting-notes
              import.
            </TooltipContent>
          </Tooltip>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Board options">
              <HugeiconsIcon
                icon={MoreHorizontalIcon}
                size={18}
                strokeWidth={1.5}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <HugeiconsIcon
                icon={PencilEdit02Icon}
                size={16}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              Edit board
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setDeleteOpen(true)}
            >
              <HugeiconsIcon
                icon={Delete02Icon}
                size={16}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              Delete board
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <form
            onSubmit={(event) => void save(event)}
            noValidate
            className="flex flex-col gap-5"
          >
            <DialogHeader>
              <DialogTitle>Edit board</DialogTitle>
              <DialogDescription>
                Columns and issues are not affected.
              </DialogDescription>
            </DialogHeader>
            <FormField id="edit-board-title" label="Title" error={titleError}>
              <Input
                id="edit-board-title"
                autoFocus
                aria-invalid={Boolean(titleError)}
                aria-describedby={describedBy("edit-board-title", titleError)}
                {...form.register("title")}
              />
            </FormField>
            <FormField
              id="edit-board-description"
              label="Description"
              hint="Optional."
            >
              <Textarea
                id="edit-board-description"
                rows={3}
                {...form.register("description")}
              />
            </FormField>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateBoard.isPending}>
                {updateBoard.isPending ? (
                  <Spinner className="size-4 text-primary-foreground" />
                ) : null}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ImportNotesDialog
        boardId={board.id}
        boardTitle={board.title}
        open={importOpen}
        onOpenChange={setImportOpen}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${board.title}?`}
        description="Every column and issue on this board will be permanently removed."
        confirmLabel="Delete board"
        destructive
        pending={deleteBoard.isPending}
        onConfirm={() =>
          deleteBoard.mutate(board.id, {
            onSuccess: (payload) => {
              toast.success(`${board.title} deleted.`);
              void navigate(`/organizations/${payload.organizationId}`, {
                replace: true,
              });
            },
            onError: (error) => toast.error(errorMessage(error)),
          })
        }
      />
    </>
  );
}
