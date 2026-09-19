import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { scheduleStaggered } from "./import-scheduler.js";

describe("scheduleStaggered", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("emits the first item at once, the rest one interval apart, then done", () => {
    const onItem = vi.fn();
    const onDone = vi.fn();

    scheduleStaggered(3, 300, onItem, onDone);

    expect(onItem.mock.calls).toEqual([[0]]);
    expect(onDone).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(onItem).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(onItem.mock.calls).toEqual([[0], [1]]);

    vi.advanceTimersByTime(300);
    expect(onItem.mock.calls).toEqual([[0], [1], [2]]);
    expect(onDone).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onItem).toHaveBeenCalledTimes(3);
  });

  it("finishes immediately when there is nothing to emit", () => {
    const onItem = vi.fn();
    const onDone = vi.fn();

    scheduleStaggered(0, 300, onItem, onDone);

    expect(onItem).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("stops emitting after cancellation", () => {
    const onItem = vi.fn();
    const onDone = vi.fn();

    const handle = scheduleStaggered(3, 300, onItem, onDone);
    vi.advanceTimersByTime(300);
    handle.cancel();
    vi.advanceTimersByTime(2_000);

    expect(onItem.mock.calls).toEqual([[0], [1]]);
    expect(onDone).not.toHaveBeenCalled();
  });
});
