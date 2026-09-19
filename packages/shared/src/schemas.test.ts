import { describe, expect, it } from "vitest";

import { updateBoardInputSchema } from "./boards.js";
import { deleteColumnInputSchema, moveColumnInputSchema } from "./columns.js";
import { apiErrorSchema } from "./errors.js";
import {
  createIssueInputSchema,
  importedIssueSchema,
  moveIssueInputSchema,
  updateIssueInputSchema,
} from "./issues.js";
import { createOrganizationInputSchema } from "./organizations.js";

describe("input schemas", () => {
  it("trims and accepts a valid organization", () => {
    const parsed = createOrganizationInputSchema.parse({
      name: "  Northwind  ",
      description: "",
    });
    expect(parsed).toEqual({ name: "Northwind", description: "" });
  });

  it("rejects blank organization names", () => {
    expect(
      createOrganizationInputSchema.safeParse({ name: "   " }).success,
    ).toBe(false);
  });

  it("rejects empty partial updates", () => {
    expect(updateBoardInputSchema.safeParse({}).success).toBe(false);
    expect(updateIssueInputSchema.safeParse({}).success).toBe(false);
    expect(
      updateIssueInputSchema.safeParse({ description: null }).success,
    ).toBe(true);
  });

  it("requires non-negative integer indexes for moves", () => {
    expect(moveColumnInputSchema.safeParse({ index: -1 }).success).toBe(false);
    expect(moveColumnInputSchema.safeParse({ index: 1.5 }).success).toBe(false);
    expect(
      moveIssueInputSchema.safeParse({ columnId: "col_1", index: 0 }).success,
    ).toBe(true);
  });

  it("allows deleting a column without a destination", () => {
    expect(deleteColumnInputSchema.parse({})).toEqual({});
    expect(
      deleteColumnInputSchema.parse({ destinationColumnId: "col_2" }),
    ).toEqual({ destinationColumnId: "col_2" });
  });

  it("caps issue titles", () => {
    expect(
      createIssueInputSchema.safeParse({ title: "x".repeat(192) }).success,
    ).toBe(false);
  });
});

describe("AI output schema", () => {
  it("defaults a missing description and requires a column", () => {
    expect(
      importedIssueSchema.parse({ title: "Ship it", columnId: "col_1" }),
    ).toEqual({ title: "Ship it", description: "", columnId: "col_1" });
    expect(importedIssueSchema.safeParse({ title: "Ship it" }).success).toBe(
      false,
    );
  });
});

describe("error envelope", () => {
  it("accepts the documented shape and rejects unknown codes", () => {
    expect(
      apiErrorSchema.safeParse({
        error: { code: "ISSUE_NOT_FOUND", message: "Gone." },
      }).success,
    ).toBe(true);
    expect(
      apiErrorSchema.safeParse({ error: { code: "NOPE", message: "x" } })
        .success,
    ).toBe(false);
  });
});
