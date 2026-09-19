import { useEffect, useState } from "react";

import { ClaudeAvatar } from "@/components/common/claude-avatar";

// What the dialog shows while the request is in flight. Claude's mark breathes
// inside a soft glow and a short message advances every couple of seconds so a
// several-second wait feels attended rather than stuck. Only the first message
// reaches assistive technology; the rest are decoration. Under reduced motion
// the glow and bar are still and the message simply changes.
const STAGES = [
  "Reading your notes…",
  "Finding the action items…",
  "Writing clear titles…",
  "Sorting them into columns…",
  "Almost there…",
];

const STAGE_MS = 2_200;

export function ImportProcessing() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setStage((current) => Math.min(current + 1, STAGES.length - 1)),
      STAGE_MS,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 rounded-lg bg-card/85 backdrop-blur-[2px] animate-in fade-in-0 animation-duration-200">
      <span role="status" className="sr-only">
        Claude is reading your notes.
      </span>

      <span className="relative flex size-14 items-center justify-center">
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-brand-claude/25 motion-safe:animate-ping motion-safe:[animation-duration:2s]"
        />
        <span
          aria-hidden="true"
          className="absolute -inset-2 rounded-full bg-brand-claude/10 motion-safe:animate-pulse"
        />
        <ClaudeAvatar
          size="default"
          className="relative size-10! shadow-lg shadow-brand-claude/30 [&_svg]:size-6!"
        />
      </span>

      <div aria-hidden="true" className="flex flex-col items-center gap-3">
        <p
          key={stage}
          className="text-sm font-medium animate-in fade-in-0 motion-safe:slide-in-from-bottom-1 animation-duration-300"
        >
          {STAGES[stage]}
        </p>
        <span className="relative h-1 w-44 overflow-hidden rounded-full bg-muted">
          <span className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-brand-claude motion-safe:animate-shimmer motion-reduce:w-full motion-reduce:opacity-40" />
        </span>
      </div>
    </div>
  );
}
