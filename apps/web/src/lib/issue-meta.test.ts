import { describe, expect, it } from "vitest";

import { describeDueDate, toCalendarDate } from "./issue-meta";

// A fixed local "today" so the tests do not depend on the clock.
const today = new Date(2026, 8, 19, 15, 30);

describe("describeDueDate", () => {
  it("names today and tomorrow and flags them as soon", () => {
    expect(describeDueDate("2026-09-19", today)).toEqual({
      label: "Today",
      tone: "soon",
      daysAway: 0,
    });
    expect(describeDueDate("2026-09-20", today)).toMatchObject({
      label: "Tomorrow",
      tone: "soon",
    });
  });

  it("counts overdue days", () => {
    expect(describeDueDate("2026-09-18", today)).toMatchObject({
      label: "Yesterday",
      tone: "overdue",
      daysAway: -1,
    });
    expect(describeDueDate("2026-09-10", today)).toMatchObject({
      label: "9 days overdue",
      tone: "overdue",
    });
  });

  it("shows a short date for later dates and adds the year when it differs", () => {
    expect(describeDueDate("2026-09-22", today)).toMatchObject({
      label: "Sep 22",
      tone: "soon",
    });
    expect(describeDueDate("2026-10-02", today)).toMatchObject({
      label: "Oct 2",
      tone: "later",
    });
    expect(describeDueDate("2027-01-05", today).label).toBe("Jan 5, 2027");
  });

  it("never shifts a calendar date by the local time zone", () => {
    expect(describeDueDate("2026-09-19", new Date(2026, 8, 19, 0, 5)).label).toBe(
      "Today",
    );
    expect(describeDueDate("2026-09-19", new Date(2026, 8, 19, 23, 55)).label).toBe(
      "Today",
    );
  });
});

describe("toCalendarDate", () => {
  it("formats local dates with zero padding", () => {
    expect(toCalendarDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
