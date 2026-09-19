import type {
  CreateInvitationInput,
  Invitation,
  OrganizationMembership,
  PendingInvitation,
} from "@huddle/shared";

import {
  assertCanManageOrganization,
  requireMembership,
} from "../../auth/authorization.js";
import type { SessionUser } from "../../auth/session.js";
import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../lib/http-error.js";
import {
  toInvitationDto,
  toOrganizationMembershipDto,
  toPendingInvitationDto,
} from "../../lib/serializers.js";
import {
  assertInvitationAcceptable,
  invitationExpiry,
  invitationNotFound,
  normalizeEmail,
} from "./invitation-policy.js";

const inviterSelect = {
  select: { id: true, name: true, email: true, image: true },
} as const;

async function requireManager(userId: string, organizationId: string) {
  const membership = await requireMembership(userId, organizationId);
  assertCanManageOrganization(membership.role);
  return membership;
}

export async function listInvitations(
  userId: string,
  organizationId: string,
): Promise<Invitation[]> {
  await requireManager(userId, organizationId);

  const invitations = await prisma.invitation.findMany({
    where: { organizationId, expiresAt: { gt: new Date() } },
    include: { invitedBy: inviterSelect },
    orderBy: { createdAt: "asc" },
  });

  return invitations.map(toInvitationDto);
}

export async function createInvitation(
  user: SessionUser,
  organizationId: string,
  input: CreateInvitationInput,
): Promise<Invitation> {
  await requireManager(user.id, organizationId);
  const email = normalizeEmail(input.email);

  // Telling a manager that an address is already in *their* workspace reveals
  // nothing they cannot see on the members list.
  const existingMember = await prisma.member.findFirst({
    where: { organizationId, user: { email } },
    select: { id: true },
  });

  if (existingMember) {
    throw new HttpError(
      409,
      "ALREADY_MEMBER",
      "That person is already a member of this workspace.",
    );
  }

  // Re-inviting an address renews the invitation instead of failing, so
  // "send it again" is a single action for the manager.
  const invitation = await prisma.invitation.upsert({
    where: { organizationId_email: { organizationId, email } },
    create: {
      email,
      role: input.role,
      organizationId,
      invitedById: user.id,
      expiresAt: invitationExpiry(),
    },
    update: {
      role: input.role,
      invitedById: user.id,
      expiresAt: invitationExpiry(),
    },
    include: { invitedBy: inviterSelect },
  });

  return toInvitationDto(invitation);
}

export async function revokeInvitation(
  userId: string,
  organizationId: string,
  invitationId: string,
): Promise<void> {
  await requireManager(userId, organizationId);

  // Scoping the delete by organization means a manager of one workspace can
  // never revoke another workspace's invitation, even with a guessed ID.
  const { count } = await prisma.invitation.deleteMany({
    where: { id: invitationId, organizationId },
  });

  if (count === 0) {
    throw invitationNotFound();
  }
}

export async function listInvitationsForUser(
  user: SessionUser,
): Promise<PendingInvitation[]> {
  const invitations = await prisma.invitation.findMany({
    where: { email: normalizeEmail(user.email), expiresAt: { gt: new Date() } },
    include: { organization: true, invitedBy: inviterSelect },
    orderBy: { createdAt: "desc" },
  });

  return invitations.map(toPendingInvitationDto);
}

export async function acceptInvitation(
  user: SessionUser,
  invitationId: string,
): Promise<OrganizationMembership> {
  const invitation = assertInvitationAcceptable(
    await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { organization: true },
    }),
    user.email,
  );

  // Joining and consuming the invitation commit together. A second accept of
  // the same invitation finds no row and gets the same 404 as a stranger.
  return prisma.$transaction(async (tx) => {
    const existing = await tx.member.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: invitation.organizationId,
        },
      },
    });

    const member =
      existing ??
      (await tx.member.create({
        data: {
          userId: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      }));

    await tx.invitation.delete({ where: { id: invitation.id } });

    return toOrganizationMembershipDto(invitation.organization, member.role);
  });
}
