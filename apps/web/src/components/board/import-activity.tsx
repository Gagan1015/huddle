import { Alert02Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";

import { useBoardPeople } from "@/components/board/board-people";
import { ClaudeAvatar } from "@/components/common/claude-avatar";
import { useImportActivity } from "@/features/imports";
import { pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

// A quiet pill at the foot of the board that every viewer sees while Claude
// turns notes into cards. The live region only announces phase changes, not
// each card, so screen readers hear a handful of messages rather than dozens.
export function ImportActivity({
  boardId,
  currentUserId,
}: {
  boardId: string;
  currentUserId: string;
}) {
  const activity = useImportActivity(boardId);
  const { userById } = useBoardPeople();

  if (activity.phase === "idle") {
    return null;
  }

  const nameOf = (userId: string | null) =>
    userId ? userById.get(userId)?.name : undefined;

  // Claude's mark breathes while Claude is working; outcomes get a plain icon.
  let icon: ReactNode = (
    <span className="relative flex shrink-0 items-center justify-center">
      <span
        aria-hidden="true"
        className="absolute -inset-1 rounded-full bg-brand-claude/20 motion-safe:animate-pulse"
      />
      <ClaudeAvatar size="sm" className="relative" />
    </span>
  );
  let title: string;
  let detail: string | null = null;
  let announcement: string;
  let progress: { received: number; total: number } | null = null;

  switch (activity.phase) {
    case "extracting": {
      const mine = activity.requestedById === currentUserId;
      const name = nameOf(activity.requestedById);
      title = mine
        ? "Claude is reading your notes…"
        : `Claude is reading ${name ? `${name}'s` : "a teammate's"} notes…`;
      announcement = "Claude is turning meeting notes into tasks.";
      break;
    }
    case "creating":
      title = "Claude is adding tasks";
      detail = `${activity.received} of ${activity.total}`;
      progress = { received: activity.received, total: activity.total };
      announcement = "Adding tasks to the board.";
      break;
    case "done":
      icon = (
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          size={18}
          strokeWidth={1.5}
          className="shrink-0 text-status-done"
          aria-hidden="true"
        />
      );
      title = `${pluralize(activity.total, "task")} created from notes`;
      announcement = `${pluralize(activity.total, "task")} created from meeting notes.`;
      break;
    case "failed":
      icon = (
        <HugeiconsIcon
          icon={Alert02Icon}
          size={18}
          strokeWidth={1.5}
          className="shrink-0 text-destructive"
          aria-hidden="true"
        />
      );
      title = "Import failed";
      detail = activity.message;
      announcement = `Import failed. ${activity.message}`;
      break;
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
      <div
        className={cn(
          "pointer-events-auto flex max-w-full items-center gap-3 rounded-full border border-border bg-card/95 py-2 pr-4 pl-3 text-sm shadow-lg shadow-primary/10 ring-1 ring-primary/10 backdrop-blur supports-backdrop-filter:bg-card/85",
          "animate-in fade-in-0 motion-safe:slide-in-from-bottom-2 animation-duration-200",
        )}
      >
        <span role="status" className="sr-only">
          {announcement}
        </span>
        {icon}
        <span className="min-w-0 truncate font-medium">{title}</span>
        {detail ? (
          <span
            className={cn(
              "min-w-0 truncate text-muted-foreground",
              progress && "tabular-nums",
            )}
          >
            {detail}
          </span>
        ) : null}
        {progress ? (
          <span
            role="progressbar"
            aria-label="Tasks added"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.received}
            className="h-1 w-20 shrink-0 overflow-hidden rounded-full bg-muted"
          >
            <span
              className="block h-full rounded-full bg-brand-claude transition-[width] duration-300 ease-out"
              style={{
                width: `${Math.round((progress.received / progress.total) * 100)}%`,
              }}
            />
          </span>
        ) : null}
      </div>
    </div>
  );
}
