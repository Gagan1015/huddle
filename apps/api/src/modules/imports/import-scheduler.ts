// Spaces out `import:card` emissions after the transaction has committed. No
// database work happens here; it only paces already-persisted issues so cards
// land one by one on every connected client.

type TimerHandle = ReturnType<typeof setTimeout>;

export interface StaggerTimers {
  setTimeout(callback: () => void, ms: number): TimerHandle;
  clearTimeout(handle: TimerHandle | undefined): void;
}

export interface StaggerHandle {
  cancel(): void;
}

const realTimers: StaggerTimers = {
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: (handle) => clearTimeout(handle),
};

/**
 * Calls `onItem(0)` immediately, then `onItem(i)` every `intervalMs`, and
 * `onDone()` one interval after the last item. Cancelling stops both.
 */
export function scheduleStaggered(
  count: number,
  intervalMs: number,
  onItem: (index: number) => void,
  onDone: () => void,
  timers: StaggerTimers = realTimers,
): StaggerHandle {
  let cancelled = false;
  let pending: TimerHandle | undefined;

  const step = (index: number) => {
    if (cancelled) {
      return;
    }

    if (index >= count) {
      onDone();
      return;
    }

    onItem(index);
    pending = timers.setTimeout(() => step(index + 1), intervalMs);
  };

  step(0);

  return {
    cancel() {
      cancelled = true;
      timers.clearTimeout(pending);
    },
  };
}
