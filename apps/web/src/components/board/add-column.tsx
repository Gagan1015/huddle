import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { toast } from "sonner";

import { Spinner } from "@/components/common/page-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateColumn } from "@/features/boards";
import { errorMessage } from "@/lib/api";

export function AddColumn({ boardId }: { boardId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const createColumn = useCreateColumn(boardId);
  const trimmed = name.trim();

  if (!open) {
    return (
      <div className="w-[85vw] shrink-0 snap-center sm:w-72">
        <Button
          variant="outline"
          className="h-11 w-full justify-start border-dashed bg-transparent text-muted-foreground hover:bg-secondary/70"
          onClick={() => setOpen(true)}
        >
          <HugeiconsIcon
            icon={Add01Icon}
            size={16}
            strokeWidth={1.5}
            aria-hidden="true"
          />
          Add column
        </Button>
      </div>
    );
  }

  const close = () => {
    setOpen(false);
    setName("");
  };

  return (
    <form
      className="flex w-[85vw] shrink-0 snap-center flex-col gap-2 rounded-2xl bg-secondary/70 p-2 sm:w-72"
      onSubmit={(event) => {
        event.preventDefault();
        if (!trimmed || createColumn.isPending) {
          return;
        }
        createColumn.mutate(
          { name: trimmed },
          {
            onSuccess: close,
            onError: (error) => toast.error(errorMessage(error)),
          },
        );
      }}
    >
      <Input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            close();
          }
        }}
        maxLength={191}
        placeholder="Column name"
        aria-label="New column name"
        className="bg-card"
      />
      <div className="flex items-center gap-1.5">
        <Button
          type="submit"
          size="sm"
          disabled={!trimmed || createColumn.isPending}
        >
          {createColumn.isPending ? (
            <Spinner className="size-3.5 text-primary-foreground" />
          ) : null}
          Add column
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={close}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
