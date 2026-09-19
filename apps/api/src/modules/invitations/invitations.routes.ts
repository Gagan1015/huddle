import { createInvitationInputSchema, idSchema } from "@huddle/shared";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";

import { getSessionUser } from "../../auth/session.js";
import { parseOrThrow } from "../../lib/validate.js";
import {
  acceptInvitation,
  createInvitation,
  listInvitations,
  listInvitationsForUser,
  revokeInvitation,
} from "./invitations.service.js";

const organizationParams = z.object({ organizationId: idSchema });
const invitationParams = z.object({ invitationId: idSchema });
const organizationInvitationParams = organizationParams.extend({
  invitationId: idSchema,
});

// Invitations are addressed to people outside the workspace, so bursts are
// capped per signed-in manager rather than per address.
const inviteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (_request, response) => getSessionUser(response).id,
  message: {
    error: {
      code: "RATE_LIMITED",
      message:
        "You have sent many invitations in a row. Wait a few minutes and try again.",
    },
  },
});

// Mounted at /organizations/:organizationId/invitations; mergeParams keeps the
// organization ID visible to these handlers.
export const organizationInvitationsRouter: Router = Router({
  mergeParams: true,
});

organizationInvitationsRouter.get("/", async (request, response) => {
  const user = getSessionUser(response);
  const { organizationId } = parseOrThrow(organizationParams, request.params);
  response.json(await listInvitations(user.id, organizationId));
});

organizationInvitationsRouter.post(
  "/",
  inviteRateLimiter,
  async (request, response) => {
    const user = getSessionUser(response);
    const { organizationId } = parseOrThrow(organizationParams, request.params);
    const input = parseOrThrow(
      createInvitationInputSchema,
      request.body,
      "invitation",
    );
    response
      .status(201)
      .json(await createInvitation(user, organizationId, input));
  },
);

organizationInvitationsRouter.delete(
  "/:invitationId",
  async (request, response) => {
    const user = getSessionUser(response);
    const { organizationId, invitationId } = parseOrThrow(
      organizationInvitationParams,
      request.params,
    );
    await revokeInvitation(user.id, organizationId, invitationId);
    response.status(204).end();
  },
);

// Mounted at /invitations: what is waiting for the signed-in user.
export const invitationsRouter: Router = Router();

invitationsRouter.get("/", async (_request, response) => {
  response.json(await listInvitationsForUser(getSessionUser(response)));
});

invitationsRouter.post("/:invitationId/accept", async (request, response) => {
  const user = getSessionUser(response);
  const { invitationId } = parseOrThrow(invitationParams, request.params);
  response.json(await acceptInvitation(user, invitationId));
});
