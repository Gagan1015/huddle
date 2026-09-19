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
  "CONFLICT",
  "RATE_LIMITED",
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
