import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRealtimeStatus, type RealtimeStatus } from "@/features/realtime";
import { cn } from "@/lib/utils";

interface IndicatorCopy {
  label: string;
  detail: string;
  dotClassName: string;
  /** Degraded states show their label; healthy states stay a quiet dot. */
  showLabel: boolean;
}

const COPY: Record<RealtimeStatus, IndicatorCopy> = {
  connecting: {
    label: "Connecting",
    detail: "Connecting to live updates.",
    dotClassName: "bg-muted-foreground/40",
    showLabel: false,
  },
  connected: {
    label: "Live",
    detail: "Changes from your team appear as they happen.",
    dotClassName: "bg-status-done",
    showLabel: false,
  },
  reconnecting: {
    label: "Reconnecting…",
    detail:
      "Live updates are paused. Your changes still save, and the board catches up when the connection returns.",
    dotClassName: "bg-status-progress motion-safe:animate-pulse",
    showLabel: true,
  },
  offline: {
    label: "Live updates off",
    detail: "Reload the page to reconnect.",
    dotClassName: "bg-muted-foreground/40",
    showLabel: true,
  },
};

export function ConnectionIndicator() {
  const status = useRealtimeStatus();
  const copy = COPY[status];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="status"
          aria-live="polite"
          tabIndex={0}
          className="flex h-8 shrink-0 items-center gap-2 rounded-md px-2 text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            aria-hidden="true"
            className={cn("size-2 rounded-full", copy.dotClassName)}
          />
          <span className={cn(!copy.showLabel && "sr-only")}>{copy.label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-64 text-center">
        {copy.detail}
      </TooltipContent>
    </Tooltip>
  );
}
