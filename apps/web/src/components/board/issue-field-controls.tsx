import { HugeiconsIcon } from "@hugeicons/react";
import { ISSUE_PRIORITIES, type IssuePriority } from "@huddle/shared";

import { useBoardPeople } from "@/components/board/board-people";
import { UserAvatar } from "@/components/common/user-avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY_META } from "@/lib/issue-meta";
import { cn } from "@/lib/utils";

// The same three controls appear in the quick-add composer (compact) and the
// issue sheet (full width), so they live here once.

type ControlSize = "sm" | "default";

export function PrioritySelect({
  id,
  value,
  onChange,
  size = "default",
  className,
  ariaLabel,
}: {
  id?: string;
  value: IssuePriority;
  onChange: (priority: IssuePriority) => void;
  size?: ControlSize;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as IssuePriority)}
    >
      <SelectTrigger
        id={id}
        size={size}
        aria-label={ariaLabel}
        className={cn(size === "sm" && "text-xs", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ISSUE_PRIORITIES.map((priority) => {
          const meta = PRIORITY_META[priority];
          return (
            <SelectItem key={priority} value={priority}>
              <HugeiconsIcon
                icon={meta.icon}
                size={14}
                strokeWidth={2}
                className={meta.className}
                aria-hidden="true"
              />
              {meta.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

// Radix Select cannot hold an empty value, so "nobody" is a sentinel.
const UNASSIGNED = "__unassigned";

export function AssigneeSelect({
  id,
  value,
  onChange,
  size = "default",
  className,
  ariaLabel,
}: {
  id?: string;
  value: string | null;
  onChange: (assigneeId: string | null) => void;
  size?: ControlSize;
  className?: string;
  ariaLabel?: string;
}) {
  const { members, userById } = useBoardPeople();
  // Keep a departed member selectable so the current value still renders.
  const unknownAssignee = value && !userById.has(value) ? value : null;

  return (
    <Select
      value={value ?? UNASSIGNED}
      onValueChange={(next) => onChange(next === UNASSIGNED ? null : next)}
    >
      <SelectTrigger
        id={id}
        size={size}
        aria-label={ariaLabel}
        className={cn(size === "sm" && "text-xs", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>
          <span
            aria-hidden="true"
            className="inline-flex size-5 shrink-0 rounded-full border border-dashed border-border"
          />
          Unassigned
        </SelectItem>
        {members.map((member) => (
          <SelectItem key={member.user.id} value={member.user.id}>
            <UserAvatar user={member.user} size="xs" />
            {member.user.name}
          </SelectItem>
        ))}
        {unknownAssignee ? (
          <SelectItem value={unknownAssignee}>
            <UserAvatar user={null} size="xs" />
            Former member
          </SelectItem>
        ) : null}
      </SelectContent>
    </Select>
  );
}

export function DueDateInput({
  id,
  value,
  onChange,
  size = "default",
  className,
  ariaLabel,
}: {
  id?: string;
  value: string | null;
  onChange: (dueDate: string | null) => void;
  size?: ControlSize;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Input
      id={id}
      type="date"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value || null)}
      aria-label={ariaLabel}
      className={cn(
        size === "sm" && "h-7 w-[8.75rem] px-2 text-xs md:text-xs",
        className,
      )}
    />
  );
}
