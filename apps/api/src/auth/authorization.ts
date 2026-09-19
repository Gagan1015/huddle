import { prisma } from "../db/prisma.js";
import type { MemberRole } from "../generated/prisma/client.js";
import { HttpError, forbidden } from "../lib/http-error.js";

// Tenant boundary: anything outside the caller's organizations is reported as
// "not available" (404) so existence is never leaked. 403 is reserved for
// role restrictions inside an organization the caller belongs to.

const ORGANIZATION_MANAGER_ROLES: readonly MemberRole[] = ["OWNER", "ADMIN"];

export async function requireMembership(
  userId: string,
  organizationId: string,
) {
  const member = await prisma.member.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    include: { organization: true },
  });

  if (!member) {
    throw new HttpError(
      404,
      "ORGANIZATION_NOT_FOUND",
      "This workspace is not available.",
    );
  }

  return member;
}

export function assertCanManageOrganization(role: MemberRole) {
  if (!ORGANIZATION_MANAGER_ROLES.includes(role)) {
    throw forbidden(
      "Only workspace owners and admins can change these settings.",
    );
  }
}

export async function requireBoardAccess(userId: string, boardId: string) {
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      organization: { members: { some: { userId } } },
    },
  });

  if (!board) {
    throw new HttpError(
      404,
      "BOARD_NOT_FOUND",
      "This board is no longer available.",
    );
  }

  return board;
}

export async function requireColumnAccess(userId: string, columnId: string) {
  const column = await prisma.boardColumn.findFirst({
    where: {
      id: columnId,
      board: { organization: { members: { some: { userId } } } },
    },
    include: { board: true },
  });

  if (!column) {
    throw new HttpError(
      404,
      "COLUMN_NOT_FOUND",
      "This column is no longer available.",
    );
  }

  return column;
}

export async function requireIssueAccess(userId: string, issueId: string) {
  const issue = await prisma.issue.findFirst({
    where: {
      id: issueId,
      column: { board: { organization: { members: { some: { userId } } } } },
    },
    include: { column: { include: { board: true } } },
  });

  if (!issue) {
    throw new HttpError(
      404,
      "ISSUE_NOT_FOUND",
      "This issue is no longer available.",
    );
  }

  return issue;
}
