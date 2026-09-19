import type {
  CreateIssueInput,
  Issue,
  IssueDeletedPayload,
  IssuePriority,
  IssueSource,
  MoveIssueInput,
  UpdateIssueInput,
} from "@huddle/shared";

import {
  requireColumnAccess,
  requireIssueAccess,
} from "../../auth/authorization.js";
import { prisma, type Prisma } from "../../db/prisma.js";
import { dueDateToDb } from "../../lib/dates.js";
import { HttpError } from "../../lib/http-error.js";
import { nextPositionAfter, planInsertion } from "../../lib/positions.js";
import { toIssueDto } from "../../lib/serializers.js";
import { publishToBoard } from "../../realtime/board-events.js";
import { boardScope } from "../../realtime/rooms.js";
import { resolveAssignment } from "./issue-policy.js";

export interface InsertIssueInput {
  columnId: string;
  title: string;
  description: string | null;
  source: IssueSource;
  createdById: string | null;
  priority?: IssuePriority;
  dueDate?: string | null;
  assigneeId?: string | null;
  assignedById?: string | null;
}

/**
 * Appends an issue to the end of a column. Shared by manual creation and the
 * meeting-notes import so both paths produce identical records.
 */
export async function insertIssue(
  tx: Prisma.TransactionClient,
  input: InsertIssueInput,
) {
  const last = await tx.issue.findFirst({
    where: { columnId: input.columnId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  return tx.issue.create({
    data: {
      columnId: input.columnId,
      title: input.title,
      description: input.description,
      source: input.source,
      createdById: input.createdById,
      priority: input.priority ?? "NONE",
      dueDate: input.dueDate ? dueDateToDb(input.dueDate) : null,
      assigneeId: input.assigneeId ?? null,
      assignedById: input.assigneeId ? (input.assignedById ?? null) : null,
      position: nextPositionAfter(last?.position),
    },
  });
}

// Only people inside the board's organization can be assigned, so a leaked
// user ID from another tenant is rejected rather than stored.
async function assertAssignable(organizationId: string, assigneeId: string) {
  const member = await prisma.member.findUnique({
    where: { userId_organizationId: { userId: assigneeId, organizationId } },
    select: { id: true },
  });

  if (!member) {
    throw new HttpError(
      400,
      "ASSIGNEE_NOT_MEMBER",
      "That person is not a member of this workspace.",
    );
  }
}

export async function createIssue(
  userId: string,
  columnId: string,
  input: CreateIssueInput,
): Promise<Issue> {
  const column = await requireColumnAccess(userId, columnId);

  if (input.assigneeId) {
    await assertAssignable(column.board.organizationId, input.assigneeId);
  }

  const issue = await prisma.$transaction((tx) =>
    insertIssue(tx, {
      columnId,
      title: input.title,
      description: input.description || null,
      source: "MANUAL",
      createdById: userId,
      priority: input.priority,
      dueDate: input.dueDate,
      assigneeId: input.assigneeId,
      assignedById: userId,
    }),
  );

  const dto = toIssueDto(issue, column.boardId);
  publishToBoard(boardScope(column.board), "issue:created", dto);

  return dto;
}

export async function getIssue(
  userId: string,
  issueId: string,
): Promise<Issue> {
  const issue = await requireIssueAccess(userId, issueId);

  return toIssueDto(issue, issue.column.boardId);
}

export async function updateIssue(
  userId: string,
  issueId: string,
  input: UpdateIssueInput,
): Promise<Issue> {
  const existing = await requireIssueAccess(userId, issueId);

  if (input.assigneeId) {
    await assertAssignable(
      existing.column.board.organizationId,
      input.assigneeId,
    );
  }

  const assignment = resolveAssignment(
    { assigneeId: existing.assigneeId, assignedById: existing.assignedById },
    input.assigneeId,
    userId,
  );

  const issue = await prisma.issue.update({
    where: { id: issueId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && {
        description: input.description || null,
      }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.dueDate !== undefined && {
        dueDate: input.dueDate ? dueDateToDb(input.dueDate) : null,
      }),
      assigneeId: assignment.assigneeId,
      assignedById: assignment.assignedById,
    },
  });

  const dto = toIssueDto(issue, existing.column.boardId);
  publishToBoard(boardScope(existing.column.board), "issue:updated", dto);

  return dto;
}

export async function moveIssue(
  userId: string,
  issueId: string,
  input: MoveIssueInput,
): Promise<Issue> {
  const existing = await requireIssueAccess(userId, issueId);
  const boardId = existing.column.boardId;

  const { issue, rebalanced } = await prisma.$transaction(async (tx) => {
    const destination = await tx.boardColumn.findFirst({
      where: { id: input.columnId, boardId },
      select: { id: true },
    });

    if (!destination) {
      throw new HttpError(
        400,
        "DESTINATION_COLUMN_INVALID",
        "That column is not on this board.",
      );
    }

    const siblings = await tx.issue.findMany({
      where: { columnId: destination.id, id: { not: issueId } },
      orderBy: { position: "asc" },
      select: { id: true, position: true },
    });
    const plan = planInsertion(siblings, input.index);

    for (const sibling of plan.rebalance) {
      await tx.issue.update({
        where: { id: sibling.id },
        data: { position: sibling.position },
      });
    }

    const moved = await tx.issue.update({
      where: { id: issueId },
      data: { columnId: destination.id, position: plan.position },
    });

    return { issue: moved, rebalanced: plan.rebalance };
  });

  const dto = toIssueDto(issue, boardId);
  // Rebalanced siblings ride along so other clients converge without refetching.
  publishToBoard(boardScope(existing.column.board), "issue:moved", {
    issue: dto,
    rebalanced,
  });

  return dto;
}

export async function deleteIssue(
  userId: string,
  issueId: string,
): Promise<IssueDeletedPayload> {
  const existing = await requireIssueAccess(userId, issueId);

  await prisma.issue.delete({ where: { id: issueId } });

  const payload = {
    boardId: existing.column.boardId,
    columnId: existing.columnId,
    issueId,
  };
  publishToBoard(boardScope(existing.column.board), "issue:deleted", payload);

  return payload;
}
