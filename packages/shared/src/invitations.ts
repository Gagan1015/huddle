import { z } from "zod";

import { idSchema, timestampSchema } from "./common.js";
import { memberRoleSchema, organizationSchema } from "./organizations.js";
import { userSummarySchema } from "./users.js";

/** Pending invitations stop being accepted this many days after they are sent. */
export const INVITATION_TTL_DAYS = 7;

// Ownership is never granted by invitation; a new owner is promoted later.
export const invitationRoleSchema = z.enum(["ADMIN", "MEMBER"]);

// Normalized before the format check so "  Sam@Example.com " is accepted and
// stored as the address the invitee will sign in with.
export const invitationEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(191)
  .pipe(z.email("Enter a valid email address."));

export const createInvitationInputSchema = z.object({
  email: invitationEmailSchema,
  role: invitationRoleSchema,
});

// What a workspace manager sees in the pending list.
export const invitationSchema = z.object({
  id: idSchema,
  email: z.string(),
  role: memberRoleSchema,
  organizationId: idSchema,
  invitedBy: userSummarySchema.nullable(),
  expiresAt: timestampSchema,
  createdAt: timestampSchema,
});

// What the invited person sees before joining: the workspace, not its ID alone.
export const pendingInvitationSchema = z.object({
  id: idSchema,
  email: z.string(),
  role: memberRoleSchema,
  organization: organizationSchema,
  invitedBy: userSummarySchema.nullable(),
  expiresAt: timestampSchema,
  createdAt: timestampSchema,
});

export type InvitationRole = z.infer<typeof invitationRoleSchema>;
export type CreateInvitationInput = z.infer<typeof createInvitationInputSchema>;
export type Invitation = z.infer<typeof invitationSchema>;
export type PendingInvitation = z.infer<typeof pendingInvitationSchema>;
