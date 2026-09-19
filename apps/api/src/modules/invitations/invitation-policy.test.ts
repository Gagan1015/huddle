import { INVITATION_TTL_DAYS } from "@huddle/shared";
import { describe, expect, it } from "vitest";

import { HttpError } from "../../lib/http-error.js";
import {
  assertInvitationAcceptable,
  invitationExpiry,
  isInvitationExpired,
  normalizeEmail,
} from "./invitation-policy.js";

const now = new Date("2026-09-19T12:00:00.000Z");
const tomorrow = new Date("2026-09-20T12:00:00.000Z");
const yesterday = new Date("2026-09-18T12:00:00.000Z");

function codeOf(run: () => unknown) {
  try {
    run();
  } catch (error) {
    if (error instanceof HttpError) {
      return error.code;
    }
    throw error;
  }
  return null;
}

describe("normalizeEmail", () => {
  it("lowercases and trims so sign-in casing never blocks an accept", () => {
    expect(normalizeEmail("  Sam@Example.COM ")).toBe("sam@example.com");
  });
});

describe("invitationExpiry", () => {
  it("expires a fixed number of days after it is sent", () => {
    const expiry = invitationExpiry(now);
    expect((expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)).toBe(
      INVITATION_TTL_DAYS,
    );
  });
});

describe("isInvitationExpired", () => {
  it("treats the exact expiry instant as expired", () => {
    expect(isInvitationExpired({ expiresAt: now }, now)).toBe(true);
    expect(isInvitationExpired({ expiresAt: tomorrow }, now)).toBe(false);
  });
});

describe("assertInvitationAcceptable", () => {
  const invitation = { email: "sam@example.com", expiresAt: tomorrow };

  it("returns the invitation for the addressed account", () => {
    expect(assertInvitationAcceptable(invitation, "Sam@Example.com", now)).toBe(
      invitation,
    );
  });

  it("hides invitations that are missing or addressed to someone else", () => {
    expect(
      codeOf(() => assertInvitationAcceptable(null, "sam@example.com", now)),
    ).toBe("INVITATION_NOT_FOUND");
    expect(
      codeOf(() =>
        assertInvitationAcceptable(invitation, "other@example.com", now),
      ),
    ).toBe("INVITATION_NOT_FOUND");
  });

  it("rejects expired invitations with a distinct code", () => {
    expect(
      codeOf(() =>
        assertInvitationAcceptable(
          { ...invitation, expiresAt: yesterday },
          "sam@example.com",
          now,
        ),
      ),
    ).toBe("INVITATION_EXPIRED");
  });

  it("checks the address before the expiry so strangers learn nothing", () => {
    expect(
      codeOf(() =>
        assertInvitationAcceptable(
          { ...invitation, expiresAt: yesterday },
          "other@example.com",
          now,
        ),
      ),
    ).toBe("INVITATION_NOT_FOUND");
  });
});
