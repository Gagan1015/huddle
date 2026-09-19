import { TextAlignLeftIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ISSUE_DESCRIPTION_MAX,
  ISSUE_TITLE_MAX,
  type IssuePriority,
} from "@huddle/shared";
import { useState, type KeyboardEvent } from "react";
import { toast } from "sonner";

import {
  AssigneeSelect,
  DueDateInput,
  PrioritySelect,
} from "@/components/board/issue-field-controls";
import { Spinner } from "@/components/common/page-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateIssue } from "@/features/boards";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Draft {
  title: string;
  description: string;
  priority: IssuePriority;
  assigneeId: string | null;
  dueDate: string | null;
}

const EMPTY_DRAFT: Draft = {
  title: "",
  description: "",
  priority: "NONE",
  assigneeId: null,
  dueDate: null,
};

// Quick-add stays quick: title plus Enter is enough. Priority, assignee, and
// due date sit one row below, and a description unfolds only when asked for.
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
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const createIssue = useCreateIssue(boardId);
  const title = draft.title.trim();

  const patch = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const submit = () => {
    if (!title || createIssue.isPending) {
      return;
    }
    const description = draft.description.trim();
    createIssue.mutate(
      {
        columnId,
        title,
        description: description || undefined,
        priority: draft.priority === "NONE" ? undefined : draft.priority,
        assigneeId: draft.assigneeId ?? undefined,
        dueDate: draft.dueDate ?? undefined,
      },
      {
        // Stay open so several issues can be entered in a row.
        onSuccess: () => setDraft(EMPTY_DRAFT),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form
      className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2 shadow-xs"
      onKeyDown={onKeyDown}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Input
        autoFocus
        value={draft.title}
        onChange={(event) => patch("title", event.target.value)}
        maxLength={ISSUE_TITLE_MAX}
        placeholder="What needs to happen?"
        aria-label={`New issue title for ${columnName}`}
      />

      {detailsOpen ? (
        <Textarea
          autoFocus
          value={draft.description}
          onChange={(event) => patch("description", event.target.value)}
          maxLength={ISSUE_DESCRIPTION_MAX}
          rows={3}
          placeholder="Add details. Ctrl+Enter adds the issue."
          aria-label="New issue description"
          className="min-h-0 text-xs md:text-xs"
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5">
        <PrioritySelect
          size="sm"
          value={draft.priority}
          onChange={(priority) => patch("priority", priority)}
          ariaLabel="Priority"
        />
        <AssigneeSelect
          size="sm"
          value={draft.assigneeId}
          onChange={(assigneeId) => patch("assigneeId", assigneeId)}
          ariaLabel="Assignee"
        />
        <DueDateInput
          size="sm"
          value={draft.dueDate}
          onChange={(dueDate) => patch("dueDate", dueDate)}
          ariaLabel="Due date"
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-pressed={detailsOpen}
          className={cn("text-muted-foreground", detailsOpen && "bg-muted")}
          onClick={() => setDetailsOpen((open) => !open)}
        >
          <HugeiconsIcon
            icon={TextAlignLeftIcon}
            size={14}
            strokeWidth={1.5}
            aria-hidden="true"
          />
          Details
        </Button>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          type="submit"
          size="sm"
          disabled={!title || createIssue.isPending}
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
