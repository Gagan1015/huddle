import { ISSUE_TITLE_MAX } from "@huddle/shared";
import { useState } from "react";
import { toast } from "sonner";

import { Spinner } from "@/components/common/page-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateIssue } from "@/features/boards";
import { errorMessage } from "@/lib/api";

export function IssueComposer({
  boardId,
  columnId,
  columnName,
  onClose,
}: {
  boardId: string;
  columnId: string;
  columnName: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const createIssue = useCreateIssue(boardId);
  const trimmed = title.trim();

  const submit = () => {
    if (!trimmed || createIssue.isPending) {
      return;
    }
    createIssue.mutate(
      { columnId, title: trimmed },
      {
        // Stay open so several issues can be entered in a row.
        onSuccess: () => setTitle(""),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  };

  return (
    <form
      className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2 shadow-xs"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Input
        autoFocus
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        }}
        maxLength={ISSUE_TITLE_MAX}
        placeholder="What needs to happen?"
        aria-label={`New issue title for ${columnName}`}
      />
      <div className="flex items-center gap-1.5">
        <Button
          type="submit"
          size="sm"
          disabled={!trimmed || createIssue.isPending}
        >
          {createIssue.isPending ? (
            <Spinner className="size-3.5 text-primary-foreground" />
          ) : null}
          Add issue
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Done
        </Button>
      </div>
    </form>
  );
}
