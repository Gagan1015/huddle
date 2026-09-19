import type {
  Board,
  BoardColumn,
  Invitation,
  Issue,
  Member,
  MemberRole,
  Organization,
  OrganizationMembership,
  PendingInvitation,
  UserSummary,
} from "@huddle/shared";

import type {
  Board as BoardRow,
  BoardColumn as BoardColumnRow,
  Invitation as InvitationRow,
  Issue as IssueRow,
  Member as MemberRow,
  Organization as OrganizationRow,
  User as UserRow,
} from "../generated/prisma/client.js";
import { dueDateFromDb } from "./dates.js";

const iso = (date: Date) => date.toISOString();

export function toUserSummary(
  user: Pick<UserRow, "id" | "name" | "email" | "image">,
): UserSummary {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image ?? null,
  };
}

export function toOrganizationDto(organization: OrganizationRow): Organization {
  return {
    id: organization.id,
    name: organization.name,
    description: organization.description ?? null,
    createdAt: iso(organization.createdAt),
    updatedAt: iso(organization.updatedAt),
  };
}

export function toOrganizationMembershipDto(
  organization: OrganizationRow,
  role: MemberRole,
): OrganizationMembership {
  return { ...toOrganizationDto(organization), role };
}

export function toMemberDto(
  member: MemberRow & {
    user: Pick<UserRow, "id" | "name" | "email" | "image">;
  },
): Member {
  return {
    id: member.id,
    role: member.role,
    user: toUserSummary(member.user),
    createdAt: iso(member.createdAt),
  };
}

type InviterRow = Pick<UserRow, "id" | "name" | "email" | "image"> | null;

export function toInvitationDto(
  invitation: InvitationRow & { invitedBy: InviterRow },
): Invitation {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    organizationId: invitation.organizationId,
    invitedBy: invitation.invitedBy
      ? toUserSummary(invitation.invitedBy)
      : null,
    expiresAt: iso(invitation.expiresAt),
    createdAt: iso(invitation.createdAt),
  };
}

export function toPendingInvitationDto(
  invitation: InvitationRow & {
    organization: OrganizationRow;
    invitedBy: InviterRow;
  },
): PendingInvitation {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    organization: toOrganizationDto(invitation.organization),
    invitedBy: invitation.invitedBy
      ? toUserSummary(invitation.invitedBy)
      : null,
    expiresAt: iso(invitation.expiresAt),
    createdAt: iso(invitation.createdAt),
  };
}

export function toBoardDto(board: BoardRow): Board {
  return {
    id: board.id,
    title: board.title,
    description: board.description ?? null,
    organizationId: board.organizationId,
    createdById: board.createdById ?? null,
    createdAt: iso(board.createdAt),
    updatedAt: iso(board.updatedAt),
  };
}

export function toColumnDto(column: BoardColumnRow): BoardColumn {
  return {
    id: column.id,
    name: column.name,
    position: column.position,
    boardId: column.boardId,
    createdAt: iso(column.createdAt),
    updatedAt: iso(column.updatedAt),
  };
}

export function toIssueDto(issue: IssueRow, boardId: string): Issue {
  return {
    id: issue.id,
    title: issue.title,
    description: issue.description ?? null,
    position: issue.position,
    source: issue.source,
    priority: issue.priority,
    dueDate: issue.dueDate ? dueDateFromDb(issue.dueDate) : null,
    columnId: issue.columnId,
    boardId,
    createdById: issue.createdById ?? null,
    assigneeId: issue.assigneeId ?? null,
    assignedById: issue.assignedById ?? null,
    createdAt: iso(issue.createdAt),
    updatedAt: iso(issue.updatedAt),
  };
}
