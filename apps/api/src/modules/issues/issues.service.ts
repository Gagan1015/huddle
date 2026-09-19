import type {
  CreateIssueInput,
  Issue,
  IssueDeletedPayload,
  IssueSource,
  MoveIssueInput,
  UpdateIssueInput,
} from "@huddle/shared";

import {
  requireColumnAccess,
  requireIssueAccess,
} from "../../auth/authorization.js";
import { prisma, type Prisma } from "../../db/prisma.js";
import { HttpError } from "../../lib/http-error.js";
import { nextPositionAfter, planInsertion } from "../../lib/positions.js";
import { toIssueDto } from "../../lib/serializers.js";
import { publishToBoard } from "../../realtime/board-events.js";

export interface InsertIssueInput {
  columnId: string;
  title: string;
  description: string | null;
  source: IssueSource;
  createdById: string | null;
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
      position: nextPositionAfter(last?.position),
    },
  });
}

export async function createIssue(
  userId: string,
  columnId: string,
  input: CreateIssueInput,
): Promise<Issue> {
  const column = await requireColumnAccess(userId, columnId);

  const issue = await prisma.$transaction((tx) =>
    insertIssue(tx, {
      columnId,
      title: input.title,
      description: input.description || null,
      source: "MANUAL",
      createdById: userId,
    }),
  );

  const dto = toIssueDto(issue, column.boardId);
  publishToBoard(column.boardId, "issue:created", dto);

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

  const issue = await prisma.issue.update({
    where: { id: issueId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && {
        description: input.description || null,
      }),
    },
  });

  const dto = toIssueDto(issue, existing.column.boardId);
  publishToBoard(existing.column.boardId, "issue:updated", dto);

  return dto;
}

export async function moveIssue(
  userId: string,
  issueId: string,
  input: MoveIssueInput,
): Promise<Issue> {
  const existing = await requireIssueAccess(userId, issueId);
  const boardId = existing.column.boardId;

  const issue = await prisma.$transaction(async (tx) => {
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

    return tx.issue.update({
      where: { id: issueId },
      data: { columnId: destination.id, position: plan.position },
    });
  });

  const dto = toIssueDto(issue, boardId);
  publishToBoard(boardId, "issue:moved", dto);

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
  publishToBoard(payload.boardId, "issue:deleted", payload);

  return payload;
}
