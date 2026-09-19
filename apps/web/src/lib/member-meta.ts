import type { InvitationRole, MemberRole } from "@huddle/shared";

export const ROLE_LABEL: Record<MemberRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

/** Roles an invitation can grant, in the order the picker shows them. */
export const INVITATION_ROLES: readonly InvitationRole[] = ["MEMBER", "ADMIN"];

// Mirrors the API rule: owners and admins change settings and invite people.
// The server still enforces it; this only decides what to show.
export function canManageOrganization(role: MemberRole) {
  return role === "OWNER" || role === "ADMIN";
}
