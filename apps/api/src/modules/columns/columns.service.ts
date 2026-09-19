import type {
  BoardColumn,
  ColumnDeletedPayload,
  CreateColumnInput,
  DeleteColumnInput,
  MoveColumnInput,
  UpdateColumnInput,
} from "@huddle/shared";

import {
  requireBoardAccess,
  requireColumnAccess,
} from "../../auth/authorization.js";
import { prisma, type Prisma } from "../../db/prisma.js";
import { HttpError } from "../../lib/http-error.js";
import {
  POSITION_GAP,
  nextPositionAfter,
  planInsertion,
} from "../../lib/positions.js";
import { toColumnDto } from "../../lib/serializers.js";
import { publishToBoard } from "../../realtime/board-events.js";
import { resolveColumnDeletion } from "./column-policy.js";

async function assertColumnNameAvailable(
  tx: Prisma.TransactionClient,
  boardId: string,
  name: string,
  exceptColumnId?: string,
) {
  const existing = await tx.boardColumn.findFirst({
    where: {
      boardId,
      name,
      ...(exceptColumnId ? { id: { not: exceptColumnId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new HttpError(
      409,
      "COLUMN_NAME_TAKEN",
      `A column named "${name}" already exists on this board.`,
    );
  }
}

export async function createColumn(
  userId: string,
  boardId: string,
  input: CreateColumnInput,
): Promise<BoardColumn> {
  await requireBoardAccess(userId, boardId);

  const column = await prisma.$transaction(async (tx) => {
    await assertColumnNameAvailable(tx, boardId, input.name);

    const last = await tx.boardColumn.findFirst({
      where: { boardId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    return tx.boardColumn.create({
      data: {
        boardId,
        name: input.name,
        position: nextPositionAfter(last?.position),
      },
    });
  });

  const dto = toColumnDto(column);
  publishToBoard(boardId, "column:created", dto);

  return dto;
}

export async function renameColumn(
  userId: string,
  columnId: string,
  input: UpdateColumnInput,
): Promise<BoardColumn> {
  const column = await requireColumnAccess(userId, columnId);

  const updated = await prisma.$transaction(async (tx) => {
    await assertColumnNameAvailable(tx, column.boardId, input.name, columnId);

    return tx.boardColumn.update({
      where: { id: columnId },
      data: { name: input.name },
    });
  });

  const dto = toColumnDto(updated);
  publishToBoard(column.boardId, "column:updated", dto);

  return dto;
}

export async function moveColumn(
  userId: string,
  columnId: string,
  input: MoveColumnInput,
): Promise<BoardColumn> {
  const column = await requireColumnAccess(userId, columnId);

  const updated = await prisma.$transaction(async (tx) => {
    const siblings = await tx.boardColumn.findMany({
      where: { boardId: column.boardId, id: { not: columnId } },
      orderBy: { position: "asc" },
      select: { id: true, position: true },
    });
    const plan = planInsertion(siblings, input.index);

    for (const sibling of plan.rebalance) {
      await tx.boardColumn.update({
        where: { id: sibling.id },
        data: { position: sibling.position },
      });
    }

    return tx.boardColumn.update({
      where: { id: columnId },
      data: { position: plan.position },
    });
  });

  const dto = toColumnDto(updated);
  publishToBoard(column.boardId, "column:moved", dto);

  return dto;
}

export async function deleteColumn(
  userId: string,
  columnId: string,
  input: DeleteColumnInput,
): Promise<ColumnDeletedPayload> {
  const column = await requireColumnAccess(userId, columnId);
  const boardId = column.boardId;

  // Moving the issues and removing the column commit together or not at all.
  const payload = await prisma.$transaction(async (tx) => {
    const [columnCount, issueCount] = await Promise.all([
      tx.boardColumn.count({ where: { boardId } }),
      tx.issue.count({ where: { columnId } }),
    ]);

    const decision = resolveColumnDeletion({
      columnId,
      columnCount,
      issueCount,
      destinationColumnId: input.destinationColumnId ?? null,
    });

    let movedIssueIds: string[] = [];

    if (decision.destinationColumnId) {
      const destination = await tx.boardColumn.findFirst({
        where: { id: decision.destinationColumnId, boardId },
        select: { id: true },
      });

      if (!destination) {
        throw new HttpError(
          400,
          "DESTINATION_COLUMN_INVALID",
          "Choose a column on the same board to receive the issues.",
        );
      }

      const issues = await tx.issue.findMany({
        where: { columnId },
        orderBy: { position: "asc" },
        select: { id: true },
      });
      const last = await tx.issue.findFirst({
        where: { columnId: destination.id },
        orderBy: { position: "desc" },
        select: { position: true },
      });

      let position = last?.position ?? 0;

      for (const issue of issues) {
        position += POSITION_GAP;
        await tx.issue.update({
          where: { id: issue.id },
          data: { columnId: destination.id, position },
        });
      }

      movedIssueIds = issues.map((issue) => issue.id);
    }

    await tx.boardColumn.delete({ where: { id: columnId } });

    return {
      boardId,
      columnId,
      destinationColumnId: decision.destinationColumnId,
      movedIssueIds,
    } satisfies ColumnDeletedPayload;
  });

  publishToBoard(boardId, "column:deleted", payload);

  return payload;
}
