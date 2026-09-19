import { describe, expect, it } from "vitest";

import { resolveAssignment } from "./issue-policy.js";

const unassigned = { assigneeId: null, assignedById: null };
const assignedToMarcus = { assigneeId: "marcus", assignedById: "priya" };

describe("resolveAssignment", () => {
  it("leaves the assignment alone when the caller did not send one", () => {
    expect(resolveAssignment(assignedToMarcus, undefined, "sam")).toBe(
      assignedToMarcus,
    );
  });

  it("keeps the original assigner when the assignee is unchanged", () => {
    expect(resolveAssignment(assignedToMarcus, "marcus", "sam")).toBe(
      assignedToMarcus,
    );
  });

  it("records the actor as assigner when the assignee changes", () => {
    expect(resolveAssignment(unassigned, "marcus", "priya")).toEqual(
      assignedToMarcus,
    );
    expect(resolveAssignment(assignedToMarcus, "sam", "sam")).toEqual({
      assigneeId: "sam",
      assignedById: "sam",
    });
  });

  it("clears the assigner when the issue is unassigned", () => {
    expect(resolveAssignment(assignedToMarcus, null, "sam")).toEqual(
      unassigned,
    );
  });
});
