import type { ImportedIssue, Issue } from "@huddle/shared";
import { describe, expect, it, vi } from "vitest";

import { HttpError } from "../../lib/http-error.js";
import {
  runImport,
  type ImportPorts,
  type ImportRequest,
} from "./import-runner.js";
import type { scheduleStaggered } from "./import-scheduler.js";
import { TaskExtractionError } from "./task-extractor.js";

const request: ImportRequest = {
  userId: "user_priya",
  board: { id: "board_1", organizationId: "org_1" },
  columns: [
    { id: "col_todo", name: "Upcoming" },
    { id: "col_doing", name: "In progress" },
  ],
  notes: "Decide on the launch date. Marcus to draft the announcement.",
};

const SCOPE = { organizationId: "org_1", boardId: "board_1" };

const modelReply = {
  tasks: [
    {
      title: "Decide on the launch date",
      description: "",
      columnId: "col_todo",
    },
    {
      title: "Draft the announcement",
      description: "Marcus owns this.",
      columnId: "col_todo",
    },
  ],
};

function issueFrom(task: ImportedIssue, index: number): Issue {
  return {
    id: `iss_${index + 1}`,
    title: task.title,
    description: task.description || null,
    position: (index + 1) * 1024,
    source: "AI_IMPORT",
    priority: "NONE",
    dueDate: null,
    columnId: task.columnId,
    boardId: "board_1",
    createdById: "user_priya",
    assigneeId: null,
    assignedById: null,
    createdAt: "2026-09-19T10:00:00.000Z",
    updatedAt: "2026-09-19T10:00:00.000Z",
  };
}

// Runs every tick synchronously; the real pacing is covered by the scheduler tests.
const immediateSchedule: typeof scheduleStaggered = (
  count,
  _intervalMs,
  onItem,
  onDone,
) => {
  for (let index = 0; index < count; index += 1) {
    onItem(index);
  }
  onDone();
  return { cancel() {} };
};

function makePorts(overrides: Partial<ImportPorts> = {}) {
  const ports: ImportPorts = {
    extractor: { extractTasks: vi.fn(async () => modelReply) },
    persistIssues: vi.fn(async (_request, tasks) => tasks.map(issueFrom)),
    publish: vi.fn(),
    schedule: immediateSchedule,
    newImportId: () => "imp_1",
    cardIntervalMs: 300,
    maxTasks: 25,
    logger: { info: vi.fn(), warn: vi.fn() },
    ...overrides,
  };
  return ports;
}

function eventsOf(ports: ImportPorts) {
  return vi.mocked(ports.publish).mock.calls.map(([, event]) => event);
}

async function httpFailureOf(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    if (error instanceof HttpError) {
      return error;
    }
    throw error;
  }
  return null;
}

describe("runImport", () => {
  it("announces, persists once, then streams one card per issue and a summary", async () => {
    const ports = makePorts();

    const result = await runImport(request, ports);

    expect(result).toMatchObject({
      importId: "imp_1",
      boardId: "board_1",
      total: 2,
    });
    expect(result.issues.map((issue) => issue.title)).toEqual([
      "Decide on the launch date",
      "Draft the announcement",
    ]);
    expect(ports.persistIssues).toHaveBeenCalledTimes(1);
    expect(vi.mocked(ports.persistIssues).mock.calls[0]?.[1]).toEqual(
      modelReply.tasks,
    );
    expect(ports.extractor.extractTasks).toHaveBeenCalledWith({
      notes: request.notes,
      columns: request.columns,
      maxTasks: 25,
    });

    expect(eventsOf(ports)).toEqual([
      "import:started",
      "import:card",
      "import:card",
      "import:done",
    ]);
    const calls = vi.mocked(ports.publish).mock.calls;
    expect(calls[0]).toEqual([
      SCOPE,
      "import:started",
      { importId: "imp_1", boardId: "board_1", requestedById: "user_priya" },
    ]);
    expect(calls[1]?.[2]).toMatchObject({
      importId: "imp_1",
      boardId: "board_1",
      index: 1,
      total: 2,
      issue: { id: "iss_1", source: "AI_IMPORT" },
    });
    expect(calls[3]).toEqual([
      SCOPE,
      "import:done",
      { importId: "imp_1", boardId: "board_1", total: 2 },
    ]);
    expect(ports.logger.info).toHaveBeenCalledTimes(1);
  });

  it("reports a model failure without touching the database", async () => {
    const ports = makePorts({
      extractor: {
        extractTasks: vi.fn(async () => {
          throw new TaskExtractionError("refused", "provider detail: cyber_x9");
        }),
      },
    });

    const error = await httpFailureOf(() => runImport(request, ports));

    expect(error).toMatchObject({ status: 502, code: "IMPORT_FAILED" });
    expect(error?.message).not.toContain("cyber_x9");
    expect(ports.persistIssues).not.toHaveBeenCalled();
    expect(eventsOf(ports)).toEqual(["import:started", "import:failed"]);
    expect(vi.mocked(ports.publish).mock.calls[1]?.[2]).toEqual({
      importId: "imp_1",
      boardId: "board_1",
      message: error?.message,
    });
    expect(ports.logger.warn).toHaveBeenCalledTimes(1);
  });

  it("maps provider configuration and rate-limit problems to their own codes", async () => {
    const failWith = (kind: "misconfigured" | "rate_limited") =>
      httpFailureOf(() =>
        runImport(
          request,
          makePorts({
            extractor: {
              extractTasks: vi.fn(async () => {
                throw new TaskExtractionError(kind, kind);
              }),
            },
          }),
        ),
      );

    expect(await failWith("misconfigured")).toMatchObject({
      status: 503,
      code: "IMPORT_UNAVAILABLE",
    });
    expect(await failWith("rate_limited")).toMatchObject({
      status: 429,
      code: "RATE_LIMITED",
    });
  });

  it("rejects output that names a column the board does not have", async () => {
    const ports = makePorts({
      extractor: {
        extractTasks: vi.fn(async () => ({
          tasks: [
            { title: "Ship", description: "", columnId: "col_elsewhere" },
          ],
        })),
      },
    });

    const error = await httpFailureOf(() => runImport(request, ports));

    expect(error).toMatchObject({ status: 502, code: "IMPORT_FAILED" });
    expect(ports.persistIssues).not.toHaveBeenCalled();
    expect(eventsOf(ports)).toEqual(["import:started", "import:failed"]);
  });

  it("treats an empty task list as a recoverable client error", async () => {
    const ports = makePorts({
      extractor: { extractTasks: vi.fn(async () => ({ tasks: [] })) },
    });

    const error = await httpFailureOf(() => runImport(request, ports));

    expect(error).toMatchObject({ status: 422, code: "IMPORT_NO_TASKS" });
    expect(ports.persistIssues).not.toHaveBeenCalled();
    expect(eventsOf(ports)).toEqual(["import:started", "import:failed"]);
  });

  it("caps how many tasks reach the database", async () => {
    const tasks = Array.from({ length: 30 }, (_, index) => ({
      title: `Task ${index + 1}`,
      description: "",
      columnId: "col_todo",
    }));
    const ports = makePorts({
      extractor: { extractTasks: vi.fn(async () => ({ tasks })) },
    });

    const result = await runImport(request, ports);

    expect(result.total).toBe(25);
    expect(vi.mocked(ports.persistIssues).mock.calls[0]?.[1]).toHaveLength(25);
    expect(ports.logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ total: 25, dropped: 5 }),
      expect.any(String),
    );
  });

  it("tells viewers when saving fails and rethrows the original error", async () => {
    const dbError = new Error("connection reset");
    const ports = makePorts({
      persistIssues: vi.fn(async () => {
        throw dbError;
      }),
    });

    await expect(runImport(request, ports)).rejects.toBe(dbError);
    expect(eventsOf(ports)).toEqual(["import:started", "import:failed"]);
    expect(vi.mocked(ports.publish).mock.calls[1]?.[2]).toMatchObject({
      importId: "imp_1",
      message: expect.stringContaining("could not be saved"),
    });
  });
});
