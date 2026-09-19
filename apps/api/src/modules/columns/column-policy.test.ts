import { describe, expect, it } from "vitest";

import { HttpError } from "../../lib/http-error.js";
import { resolveColumnDeletion } from "./column-policy.js";

function codeOf(run: () => unknown) {
  try {
    run();
  } catch (error) {
    if (error instanceof HttpError) {
      return error.code;
    }
    throw error;
  }
  return null;
}

describe("resolveColumnDeletion", () => {
  it("refuses to delete the last column", () => {
    expect(
      codeOf(() =>
        resolveColumnDeletion({
          columnId: "a",
          columnCount: 1,
          issueCount: 0,
          destinationColumnId: null,
        }),
      ),
    ).toBe("LAST_COLUMN");
  });

  it("deletes an empty column without a destination", () => {
    expect(
      resolveColumnDeletion({
        columnId: "a",
        columnCount: 3,
        issueCount: 0,
        destinationColumnId: null,
      }),
    ).toEqual({ destinationColumnId: null });
  });

  it("ignores a destination when there is nothing to move", () => {
    expect(
      resolveColumnDeletion({
        columnId: "a",
        columnCount: 3,
        issueCount: 0,
        destinationColumnId: "b",
      }),
    ).toEqual({ destinationColumnId: null });
  });

  it("requires a destination for a non-empty column", () => {
    expect(
      codeOf(() =>
        resolveColumnDeletion({
          columnId: "a",
          columnCount: 3,
          issueCount: 2,
          destinationColumnId: null,
        }),
      ),
    ).toBe("COLUMN_NOT_EMPTY");
  });

  it("rejects moving issues into the column being deleted", () => {
    expect(
      codeOf(() =>
        resolveColumnDeletion({
          columnId: "a",
          columnCount: 3,
          issueCount: 2,
          destinationColumnId: "a",
        }),
      ),
    ).toBe("DESTINATION_COLUMN_INVALID");
  });

  it("returns the destination when everything checks out", () => {
    expect(
      resolveColumnDeletion({
        columnId: "a",
        columnCount: 2,
        issueCount: 5,
        destinationColumnId: "b",
      }),
    ).toEqual({ destinationColumnId: "b" });
  });
});
