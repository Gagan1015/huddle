import { z } from "zod";

import { pendingInvitationSchema } from "./invitations.js";
import { organizationMembershipSchema } from "./organizations.js";
import { userSummarySchema } from "./users.js";

// Everything the web app needs right after sign-in: who the user is, which
// workspaces they belong to, and which ones are waiting for them to join.
export const meSchema = z.object({
  user: userSummarySchema,
  organizations: z.array(organizationMembershipSchema),
  invitations: z.array(pendingInvitationSchema),
});

export type Me = z.infer<typeof meSchema>;
