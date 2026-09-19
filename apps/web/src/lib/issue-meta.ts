import {
  Alert02Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowUpDoubleIcon,
  MinusSignIcon,
} from "@hugeicons/core-free-icons";
import type { IssuePriority } from "@huddle/shared";

// Presentation for issue metadata. Colors come from the status tokens so
// priority never introduces a new palette; `NONE` renders nothing on cards.

export interface PriorityMeta {
  label: string;
  icon: typeof MinusSignIcon;
  className: string;
}

export const PRIORITY_META: Record<IssuePriority, PriorityMeta> = {
  NONE: {
    label: "No priority",
    icon: MinusSignIcon,
    className: "text-muted-foreground",
  },
  LOW: {
    label: "Low",
    icon: ArrowDown01Icon,
    className: "text-muted-foreground",
  },
  MEDIUM: {
    label: "Medium",
    icon: ArrowUp01Icon,
    className: "text-status-upcoming",
  },
  HIGH: {
    label: "High",
    icon: ArrowUpDoubleIcon,
    className: "text-status-progress",
  },
  URGENT: {
    label: "Urgent",
    icon: Alert02Icon,
    className: "text-destructive",
  },
};

export type DueTone = "overdue" | "soon" | "later";

export interface DueDateMeta {
  label: string;
  tone: DueTone;
  /** Days from today; negative when overdue. */
  daysAway: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Due dates are calendar dates. Parse the YYYY-MM-DD parts directly so the
// browser's time zone never shifts them by a day.
function parseCalendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function describeDueDate(
  value: string,
  today: Date = new Date(),
): DueDateMeta {
  const due = parseCalendarDate(value);
  const daysAway = Math.round(
    (due.getTime() - startOfDay(today).getTime()) / DAY_MS,
  );

  if (daysAway < 0) {
    const days = Math.abs(daysAway);
    return {
      label: days === 1 ? "Yesterday" : `${days} days overdue`,
      tone: "overdue",
      daysAway,
    };
  }

  if (daysAway === 0) {
    return { label: "Today", tone: "soon", daysAway };
  }

  if (daysAway === 1) {
    return { label: "Tomorrow", tone: "soon", daysAway };
  }

  const sameYear = due.getFullYear() === today.getFullYear();
  const label = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(due);

  return { label, tone: daysAway <= 3 ? "soon" : "later", daysAway };
}

export const DUE_TONE_CLASS: Record<DueTone, string> = {
  overdue: "text-destructive",
  soon: "text-status-progress",
  later: "text-muted-foreground",
};

/** Formats a Date as the YYYY-MM-DD the API expects, in local time. */
export function toCalendarDate(date: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
