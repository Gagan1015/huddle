import type { BoardColumn } from "@huddle/shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDeleteColumn } from "@/features/boards";
import { errorMessage } from "@/lib/api";
import { pluralize } from "@/lib/format";

export function DeleteColumnDialog({
  boardId,
  column,
  columns,
  issueCount,
  open,
  onOpenChange,
}: {
  boardId: string;
  column: BoardColumn;
  columns: BoardColumn[];
  issueCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const others = columns.filter((candidate) => candidate.id !== column.id);
  const [destinationId, setDestinationId] = useState<string>("");
  const [error, setError] = useState<string | undefined>();
  const deleteColumn = useDeleteColumn(boardId);
  const needsDestination = issueCount > 0;

  useEffect(() => {
    if (open) {
      setDestinationId(others[0]?.id ?? "");
      setError(undefined);
    }
    // Reset only when the dialog opens; `others` changes with every refetch.
  }, [open]);

  const confirm = () => {
    if (needsDestination && !destinationId) {
      setError("Choose where the issues should go.");
      return;
    }
    deleteColumn.mutate(
      {
        columnId: column.id,
        ...(needsDestination ? { destinationColumnId: destinationId } : {}),
      },
      {
        onSuccess: (payload) => {
          onOpenChange(false);
          const moved = payload.movedIssueIds.length;
          toast.success(
            moved > 0
              ? `${column.name} deleted. ${pluralize(moved, "issue")} moved.`
              : `${column.name} deleted.`,
          );
        },
        onError: (mutationError) => setError(errorMessage(mutationError)),
      },
    );
  };

  const selectId = `delete-${column.id}-destination`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {column.name}?</DialogTitle>
          <DialogDescription>
            {needsDestination
              ? `This column has ${pluralize(issueCount, "issue")}. Pick another column to keep them.`
              : "This column is empty and can be removed right away."}
          </DialogDescription>
        </DialogHeader>
        {needsDestination ? (
          <FormField id={selectId} label="Move issues to" error={error}>
            <Select value={destinationId} onValueChange={setDestinationId}>
              <SelectTrigger
                id={selectId}
                className="w-full"
                aria-invalid={Boolean(error)}
              >
                <SelectValue placeholder="Choose a column" />
              </SelectTrigger>
              <SelectContent>
                {others.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleteColumn.isPending}
            onClick={confirm}
          >
            {deleteColumn.isPending ? <Spinner className="size-4" /> : null}
            {needsDestination ? "Move issues and delete" : "Delete column"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
