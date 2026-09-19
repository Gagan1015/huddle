import { INVITATION_TTL_DAYS } from "@huddle/shared";

import { HttpError } from "../../lib/http-error.js";

// Pure rules for invitations so they can be tested without Prisma. The service
// loads rows and calls these before it writes anything.

const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function invitationExpiry(now = new Date()): Date {
  return new Date(now.getTime() + INVITATION_TTL_DAYS * DAY_MS);
}

export function isInvitationExpired(
  invitation: { expiresAt: Date },
  now = new Date(),
): boolean {
  return invitation.expiresAt.getTime() <= now.getTime();
}

export const invitationNotFound = () =>
  new HttpError(
    404,
    "INVITATION_NOT_FOUND",
    "This invitation is not available. It may have been revoked, or it was sent to a different email address.",
  );

// An invitation is only ever acceptable by the account whose email it names.
// Anything else (missing, revoked, someone else's) is the same 404 so a link
// never reveals who was invited where.
export function assertInvitationAcceptable<
  Invitation extends { email: string; expiresAt: Date },
>(
  invitation: Invitation | null,
  userEmail: string,
  now = new Date(),
): Invitation {
  if (!invitation || invitation.email !== normalizeEmail(userEmail)) {
    throw invitationNotFound();
  }

  if (isInvitationExpired(invitation, now)) {
    throw new HttpError(
      410,
      "INVITATION_EXPIRED",
      "This invitation has expired. Ask a workspace owner or admin to send a new one.",
    );
  }

  return invitation;
}
