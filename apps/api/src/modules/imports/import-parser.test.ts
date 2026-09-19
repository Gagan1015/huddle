import { ISSUE_DESCRIPTION_MAX, ISSUE_TITLE_MAX } from "@huddle/shared";
import { describe, expect, it } from "vitest";

import { ImportParseError, parseExtractedTasks } from "./import-parser.js";

const COLUMNS = ["col_todo", "col_doing", "col_done"];

// What a well-behaved model reply looks like after JSON.parse.
const fixture = {
  tasks: [
    {
      title: "Finalize pricing page copy",
      description: "Marketing needs the tier names before Thursday's review.",
      columnId: "col_todo",
    },
    {
      title: "Migrate billing webhooks to the new queue",
      description: "",
      columnId: "col_doing",
    },
  ],
};

function failureOf(run: () => unknown) {
  try {
    run();
  } catch (error) {
    if (error instanceof ImportParseError) {
      return error;
    }
    throw error;
  }
  return null;
}

describe("parseExtractedTasks", () => {
  it("accepts a valid response and keeps task order", () => {
    const result = parseExtractedTasks(fixture, COLUMNS);

    expect(result.dropped).toBe(0);
    expect(result.tasks.map((task) => task.title)).toEqual([
      "Finalize pricing page copy",
      "Migrate billing webhooks to the new queue",
    ]);
    expect(result.tasks[1]?.description).toBe("");
  });

  it("normalizes whitespace, null descriptions, and over-long text", () => {
    const result = parseExtractedTasks(
      {
        tasks: [
          {
            title: `  Ship\n the   ${"x".repeat(ISSUE_TITLE_MAX)} `,
            description: null,
            columnId: "col_todo",
          },
          {
            title: "Trim me",
            description: `Line one  \r\n\r\n\r\n\r\nLine two ${"y".repeat(ISSUE_DESCRIPTION_MAX)}`,
            columnId: "col_done",
          },
        ],
      },
      COLUMNS,
    );

    const [first, second] = result.tasks;
    expect(first?.title.startsWith("Ship the x")).toBe(true);
    expect(first?.title).toHaveLength(ISSUE_TITLE_MAX);
    expect(first?.title.endsWith("…")).toBe(true);
    expect(first?.description).toBe("");
    expect(second?.description.startsWith("Line one\n\nLine two")).toBe(true);
    expect(second?.description).toHaveLength(ISSUE_DESCRIPTION_MAX);
  });

  it("rejects responses that are not a task list", () => {
    expect(failureOf(() => parseExtractedTasks(null, COLUMNS))?.code).toBe(
      "MALFORMED",
    );
    expect(
      failureOf(() => parseExtractedTasks(fixture.tasks, COLUMNS))?.code,
    ).toBe("MALFORMED");
    expect(
      failureOf(() =>
        parseExtractedTasks({ tasks: [{ columnId: "col_todo" }] }, COLUMNS),
      )?.code,
    ).toBe("MALFORMED");
    expect(
      failureOf(() =>
        parseExtractedTasks(
          { tasks: [{ title: "   ", columnId: "col_todo" }] },
          COLUMNS,
        ),
      )?.code,
    ).toBe("MALFORMED");
  });

  it("rejects the whole import when any task names an unknown column", () => {
    const error = failureOf(() =>
      parseExtractedTasks(
        {
          tasks: [
            ...fixture.tasks,
            { title: "Sneaky", description: "", columnId: "col_other" },
          ],
        },
        COLUMNS,
      ),
    );

    expect(error?.code).toBe("UNKNOWN_COLUMN");
    expect(error?.details).toEqual(["col_other"]);
  });

  it("reports an empty list as nothing to import", () => {
    expect(
      failureOf(() => parseExtractedTasks({ tasks: [] }, COLUMNS))?.code,
    ).toBe("NO_TASKS");
  });

  it("caps the number of tasks and reports how many were dropped", () => {
    const tasks = Array.from({ length: 7 }, (_, index) => ({
      title: `Task ${index + 1}`,
      description: "",
      columnId: "col_todo",
    }));

    const result = parseExtractedTasks({ tasks }, COLUMNS, 5);

    expect(result.tasks).toHaveLength(5);
    expect(result.tasks.at(-1)?.title).toBe("Task 5");
    expect(result.dropped).toBe(2);
  });
});
