import { z } from "zod";

export const apiErrorCodes = [
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "ORGANIZATION_NOT_FOUND",
  "BOARD_NOT_FOUND",
  "COLUMN_NOT_FOUND",
  "ISSUE_NOT_FOUND",
  "COLUMN_NAME_TAKEN",
  "LAST_COLUMN",
  "COLUMN_NOT_EMPTY",
  "DESTINATION_COLUMN_INVALID",
  "ASSIGNEE_NOT_MEMBER",
  // Invitations: the address already belongs to a member, the invitation is
  // not addressed to the caller (or was revoked), or its expiry passed.
  "ALREADY_MEMBER",
  "INVITATION_NOT_FOUND",
  "INVITATION_EXPIRED",
  "CONFLICT",
  "RATE_LIMITED",
  // Meeting-notes import: not configured, nothing actionable found, or the
  // model call/response could not be turned into issues.
  "IMPORT_UNAVAILABLE",
  "IMPORT_NO_TASKS",
  "IMPORT_FAILED",
  "INTERNAL_ERROR",
] as const;

export const apiErrorCodeSchema = z.enum(apiErrorCodes);

export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
