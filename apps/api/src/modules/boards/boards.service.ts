import {
  DEFAULT_COLUMN_NAMES,
  type Board,
  type BoardDeletedPayload,
  type BoardDetail,
  type BoardSummary,
  type CreateBoardInput,
  type UpdateBoardInput,
} from "@huddle/shared";

import {
  requireBoardAccess,
  requireMembership,
} from "../../auth/authorization.js";
import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../lib/http-error.js";
import { spreadPositions } from "../../lib/positions.js";
import { toBoardDto, toColumnDto, toIssueDto } from "../../lib/serializers.js";
import { publishToOrganization } from "../../realtime/board-events.js";

export async function listBoards(
  userId: string,
  organizationId: string,
): Promise<BoardSummary[]> {
  await requireMembership(userId, organizationId);

  const boards = await prisma.board.findMany({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { columns: true } },
      columns: { select: { _count: { select: { issues: true } } } },
    },
  });

  return boards.map((board) => ({
    ...toBoardDto(board),
    columnCount: board._count.columns,
    issueCount: board.columns.reduce(
      (total, column) => total + column._count.issues,
      0,
    ),
  }));
}

export async function createBoard(
  userId: string,
  organizationId: string,
  input: CreateBoardInput,
): Promise<Board> {
  await requireMembership(userId, organizationId);

  const positions = spreadPositions(DEFAULT_COLUMN_NAMES.length);

  // Nested create runs in one transaction, so a board can never exist without
  // its starter columns.
  const board = await prisma.board.create({
    data: {
      title: input.title,
      description: input.description || null,
      organizationId,
      createdById: userId,
      columns: {
        create: DEFAULT_COLUMN_NAMES.map((name, index) => ({
          name,
          position: positions[index] ?? (index + 1) * 1024,
        })),
      },
    },
  });

  const dto = toBoardDto(board);
  publishToOrganization(organizationId, "board:created", dto);

  return dto;
}

export async function getBoardDetail(
  userId: string,
  boardId: string,
): Promise<BoardDetail> {
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      organization: { members: { some: { userId } } },
    },
    include: {
      columns: {
        orderBy: { position: "asc" },
        include: { issues: { orderBy: { position: "asc" } } },
      },
    },
  });

  if (!board) {
    throw new HttpError(
      404,
      "BOARD_NOT_FOUND",
      "This board is no longer available.",
    );
  }

  return {
    ...toBoardDto(board),
    columns: board.columns.map(toColumnDto),
    issues: board.columns.flatMap((column) =>
      column.issues.map((issue) => toIssueDto(issue, board.id)),
    ),
  };
}

export async function updateBoard(
  userId: string,
  boardId: string,
  input: UpdateBoardInput,
): Promise<Board> {
  await requireBoardAccess(userId, boardId);

  const board = await prisma.board.update({
    where: { id: boardId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && {
        description: input.description || null,
      }),
    },
  });

  const dto = toBoardDto(board);
  publishToOrganization(board.organizationId, "board:updated", dto);

  return dto;
}

export async function deleteBoard(
  userId: string,
  boardId: string,
): Promise<BoardDeletedPayload> {
  const board = await requireBoardAccess(userId, boardId);

  // Issues restrict column deletion, so they go first; columns cascade.
  await prisma.$transaction(async (tx) => {
    await tx.issue.deleteMany({ where: { column: { boardId } } });
    await tx.board.delete({ where: { id: boardId } });
  });

  const payload = { organizationId: board.organizationId, boardId };
  publishToOrganization(board.organizationId, "board:deleted", payload);

  return payload;
}
