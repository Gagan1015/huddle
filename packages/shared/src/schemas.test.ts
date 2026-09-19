import { describe, expect, it } from "vitest";

import { updateBoardInputSchema } from "./boards.js";
import { deleteColumnInputSchema, moveColumnInputSchema } from "./columns.js";
import { apiErrorSchema } from "./errors.js";
import {
  IMPORT_MAX_ISSUES,
  MEETING_NOTES_MAX,
  importCardPayloadSchema,
  importedIssueListSchema,
  importedIssueSchema,
  importNotesInputSchema,
} from "./imports.js";
import {
  createInvitationInputSchema,
  pendingInvitationSchema,
} from "./invitations.js";
import {
  createIssueInputSchema,
  issueMovedPayloadSchema,
  moveIssueInputSchema,
  updateIssueInputSchema,
} from "./issues.js";
import { meSchema } from "./me.js";
import { createOrganizationInputSchema } from "./organizations.js";
import { boardRoomPayloadSchema, socketAckSchema } from "./socket-events.js";

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

  it("accepts priority, assignee, and a calendar due date on issues", () => {
    expect(
      createIssueInputSchema.parse({
        title: "Ship",
        priority: "HIGH",
        assigneeId: "user_1",
        dueDate: "2026-10-02",
      }),
    ).toEqual({
      title: "Ship",
      priority: "HIGH",
      assigneeId: "user_1",
      dueDate: "2026-10-02",
    });
    expect(
      createIssueInputSchema.safeParse({ title: "Ship", priority: "ASAP" })
        .success,
    ).toBe(false);
    expect(
      createIssueInputSchema.safeParse({
        title: "Ship",
        dueDate: "2026-10-02T10:00:00Z",
      }).success,
    ).toBe(false);
    expect(
      updateIssueInputSchema.parse({ assigneeId: null, dueDate: null }),
    ).toEqual({ assigneeId: null, dueDate: null });
  });
});

describe("invitations", () => {
  it("normalizes the address before validating it", () => {
    expect(
      createInvitationInputSchema.parse({
        email: "  Sam@Example.COM ",
        role: "MEMBER",
      }),
    ).toEqual({ email: "sam@example.com", role: "MEMBER" });
  });

  it("rejects malformed addresses and missing roles", () => {
    expect(
      createInvitationInputSchema.safeParse({ email: "sam", role: "MEMBER" })
        .success,
    ).toBe(false);
    expect(
      createInvitationInputSchema.safeParse({ email: "sam@example.com" })
        .success,
    ).toBe(false);
  });

  it("never grants ownership through an invitation", () => {
    expect(
      createInvitationInputSchema.safeParse({
        email: "sam@example.com",
        role: "OWNER",
      }).success,
    ).toBe(false);
    expect(
      createInvitationInputSchema.safeParse({
        email: "sam@example.com",
        role: "ADMIN",
      }).success,
    ).toBe(true);
  });

  it("lists pending invitations alongside memberships on /me", () => {
    const organization = {
      id: "org_1",
      name: "Northwind",
      description: null,
      createdAt: "2026-09-19T00:00:00.000Z",
      updatedAt: "2026-09-19T00:00:00.000Z",
    };
    const invitation = {
      id: "inv_1",
      email: "sam@example.com",
      role: "MEMBER",
      organization,
      invitedBy: null,
      expiresAt: "2026-09-26T00:00:00.000Z",
      createdAt: "2026-09-19T00:00:00.000Z",
    };
    expect(pendingInvitationSchema.safeParse(invitation).success).toBe(true);
    expect(
      meSchema.safeParse({
        user: {
          id: "user_1",
          name: "Sam",
          email: "sam@example.com",
          image: null,
        },
        organizations: [],
        invitations: [invitation],
      }).success,
    ).toBe(true);
    expect(
      meSchema.safeParse({
        user: {
          id: "user_1",
          name: "Sam",
          email: "sam@example.com",
          image: null,
        },
        organizations: [],
      }).success,
    ).toBe(false);
  });
});

// A complete issue DTO shared by the payload tests below.
const issue = {
  id: "iss_1",
  title: "Ship",
  description: null,
  position: 2048,
  source: "MANUAL",
  priority: "NONE",
  dueDate: null,
  columnId: "col_1",
  boardId: "board_1",
  createdById: null,
  assigneeId: null,
  assignedById: null,
  createdAt: "2026-09-19T00:00:00.000Z",
  updatedAt: "2026-09-19T00:00:00.000Z",
};

describe("meeting-notes import", () => {
  it("requires non-blank notes within the length limit", () => {
    expect(
      importNotesInputSchema.parse({ notes: "  Decide on dates  " }),
    ).toEqual({ notes: "Decide on dates" });
    expect(importNotesInputSchema.safeParse({ notes: "   " }).success).toBe(
      false,
    );
    expect(
      importNotesInputSchema.safeParse({
        notes: "x".repeat(MEETING_NOTES_MAX + 1),
      }).success,
    ).toBe(false);
    expect(importNotesInputSchema.safeParse({}).success).toBe(false);
  });

  it("defaults a missing description and requires a column", () => {
    expect(
      importedIssueSchema.parse({ title: "Ship it", columnId: "col_1" }),
    ).toEqual({ title: "Ship it", description: "", columnId: "col_1" });
    expect(importedIssueSchema.safeParse({ title: "Ship it" }).success).toBe(
      false,
    );
    expect(
      importedIssueSchema.safeParse({ title: "   ", columnId: "col_1" })
        .success,
    ).toBe(false);
  });

  it("expects the model response to be an object holding a task list", () => {
    expect(
      importedIssueListSchema.parse({
        tasks: [{ title: "Ship it", columnId: "col_1" }],
      }).tasks,
    ).toHaveLength(1);
    expect(
      importedIssueListSchema.safeParse([{ title: "Ship it", columnId: "c" }])
        .success,
    ).toBe(false);
    expect(importedIssueListSchema.safeParse({ tasks: "none" }).success).toBe(
      false,
    );
    expect(IMPORT_MAX_ISSUES).toBeGreaterThan(0);
  });

  it("carries the committed issue plus progress counters on import:card", () => {
    expect(
      importCardPayloadSchema.safeParse({
        importId: "imp_1",
        boardId: "board_1",
        issue,
        index: 1,
        total: 3,
      }).success,
    ).toBe(true);
    expect(
      importCardPayloadSchema.safeParse({
        importId: "imp_1",
        boardId: "board_1",
        issue,
        index: 0,
        total: 3,
      }).success,
    ).toBe(false);
  });
});

describe("socket contracts", () => {
  it("requires a board id to join a room and drops unknown fields", () => {
    expect(boardRoomPayloadSchema.safeParse({}).success).toBe(false);
    expect(boardRoomPayloadSchema.safeParse({ boardId: "" }).success).toBe(
      false,
    );
    expect(
      boardRoomPayloadSchema.parse({ boardId: "board_1", room: "org:x" }),
    ).toEqual({ boardId: "board_1" });
  });

  it("acknowledges with either success or a coded failure", () => {
    expect(socketAckSchema.safeParse({ ok: true }).success).toBe(true);
    expect(
      socketAckSchema.safeParse({
        ok: false,
        code: "BOARD_NOT_FOUND",
        message: "Gone.",
      }).success,
    ).toBe(true);
    expect(socketAckSchema.safeParse({ ok: false }).success).toBe(false);
  });

  it("carries rebalanced sibling positions with a move", () => {
    expect(
      issueMovedPayloadSchema.safeParse({ issue, rebalanced: [] }).success,
    ).toBe(true);
    expect(
      issueMovedPayloadSchema.safeParse({
        issue,
        rebalanced: [{ id: "iss_2", position: -1 }],
      }).success,
    ).toBe(false);
    expect(issueMovedPayloadSchema.safeParse({ issue }).success).toBe(false);
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
      apiErrorSchema.safeParse({
        error: { code: "IMPORT_NO_TASKS", message: "Nothing to do." },
      }).success,
    ).toBe(true);
    expect(
      apiErrorSchema.safeParse({
        error: { code: "INVITATION_EXPIRED", message: "Ask for a new one." },
      }).success,
    ).toBe(true);
    expect(
      apiErrorSchema.safeParse({ error: { code: "NOPE", message: "x" } })
        .success,
    ).toBe(false);
  });
});
