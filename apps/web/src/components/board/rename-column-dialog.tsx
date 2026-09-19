import type { BoardColumn } from "@huddle/shared";
import { useEffect, useState } from "react";

import { FormField } from "@/components/common/form-field";
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
import { useRenameColumn } from "@/features/boards";
import { errorMessage } from "@/lib/api";

export function RenameColumnDialog({
  boardId,
  column,
  open,
  onOpenChange,
}: {
  boardId: string;
  column: BoardColumn;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(column.name);
  const [error, setError] = useState<string | undefined>();
  const renameColumn = useRenameColumn(boardId);

  useEffect(() => {
    if (open) {
      setName(column.name);
      setError(undefined);
    }
  }, [open, column.name]);

  const trimmed = name.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!trimmed) {
              setError("Give the column a name.");
              return;
            }
            if (trimmed === column.name) {
              onOpenChange(false);
              return;
            }
            renameColumn.mutate(
              { columnId: column.id, name: trimmed },
              {
                onSuccess: () => onOpenChange(false),
                onError: (mutationError) =>
                  setError(errorMessage(mutationError)),
              },
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>Rename column</DialogTitle>
            <DialogDescription>Issues stay where they are.</DialogDescription>
          </DialogHeader>
          <FormField
            id={`rename-${column.id}`}
            label="Column name"
            error={error}
          >
            <Input
              id={`rename-${column.id}`}
              autoFocus
              value={name}
              maxLength={191}
              onChange={(event) => {
                setName(event.target.value);
                setError(undefined);
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `rename-${column.id}-error` : undefined}
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
            <Button type="submit" disabled={renameColumn.isPending}>
              {renameColumn.isPending ? (
                <Spinner className="size-4 text-primary-foreground" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
