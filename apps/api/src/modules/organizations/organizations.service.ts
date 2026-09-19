import type {
  CreateOrganizationInput,
  Me,
  Member,
  OrganizationMembership,
  UpdateOrganizationInput,
} from "@huddle/shared";

import {
  assertCanManageOrganization,
  requireMembership,
} from "../../auth/authorization.js";
import type { SessionUser } from "../../auth/session.js";
import { prisma } from "../../db/prisma.js";
import {
  toMemberDto,
  toOrganizationMembershipDto,
  toUserSummary,
} from "../../lib/serializers.js";

export async function listOrganizationsForUser(
  userId: string,
): Promise<OrganizationMembership[]> {
  const memberships = await prisma.member.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: { organization: { name: "asc" } },
  });

  return memberships.map((membership) =>
    toOrganizationMembershipDto(membership.organization, membership.role),
  );
}

export async function getMe(user: SessionUser): Promise<Me> {
  return {
    user: toUserSummary({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
    }),
    organizations: await listOrganizationsForUser(user.id),
  };
}

export async function createOrganization(
  userId: string,
  input: CreateOrganizationInput,
): Promise<OrganizationMembership> {
  const organization = await prisma.organization.create({
    data: {
      name: input.name,
      description: input.description || null,
      members: { create: { userId, role: "OWNER" } },
    },
  });

  return toOrganizationMembershipDto(organization, "OWNER");
}

export async function getOrganization(
  userId: string,
  organizationId: string,
): Promise<OrganizationMembership> {
  const membership = await requireMembership(userId, organizationId);

  return toOrganizationMembershipDto(membership.organization, membership.role);
}

export async function updateOrganization(
  userId: string,
  organizationId: string,
  input: UpdateOrganizationInput,
): Promise<OrganizationMembership> {
  const membership = await requireMembership(userId, organizationId);
  assertCanManageOrganization(membership.role);

  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && {
        description: input.description || null,
      }),
    },
  });

  return toOrganizationMembershipDto(organization, membership.role);
}

export async function listMembers(
  userId: string,
  organizationId: string,
): Promise<Member[]> {
  await requireMembership(userId, organizationId);

  const members = await prisma.member.findMany({
    where: { organizationId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return members.map(toMemberDto);
}
