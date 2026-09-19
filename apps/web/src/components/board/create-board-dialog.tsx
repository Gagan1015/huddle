import { zodResolver } from "@hookform/resolvers/zod";
import { createBoardInputSchema, type CreateBoardInput } from "@huddle/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateBoard } from "@/features/boards";
import { errorMessage } from "@/lib/api";

export function CreateBoardDialog({
  organizationId,
  open,
  onOpenChange,
}: {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const createBoard = useCreateBoard(organizationId);
  const form = useForm<CreateBoardInput>({
    resolver: zodResolver(createBoardInputSchema),
    defaultValues: { title: "", description: "" },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const titleError = form.formState.errors.title?.message;

  const submit = form.handleSubmit((values) => {
    createBoard.mutate(values, {
      onSuccess: (board) => {
        onOpenChange(false);
        toast.success(`${board.title} created with starter columns.`);
        void navigate(`/boards/${board.id}`);
      },
      onError: (error) => toast.error(errorMessage(error)),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => void submit(event)}
          noValidate
          className="flex flex-col gap-5"
        >
          <DialogHeader>
            <DialogTitle>New board</DialogTitle>
            <DialogDescription>
              Boards start with Upcoming, In progress, and Done. Rename or add
              columns any time.
            </DialogDescription>
          </DialogHeader>
          <FormField id="board-title" label="Title" error={titleError}>
            <Input
              id="board-title"
              placeholder="Q4 launch planning"
              autoFocus
              aria-invalid={Boolean(titleError)}
              aria-describedby={describedBy("board-title", titleError)}
              {...form.register("title")}
            />
          </FormField>
          <FormField
            id="board-description"
            label="Description"
            hint="Optional."
          >
            <Textarea
              id="board-description"
              rows={3}
              {...form.register("description")}
            />
          </FormField>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createBoard.isPending}>
              {createBoard.isPending ? (
                <Spinner className="size-4 text-primary-foreground" />
              ) : null}
              Create board
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
