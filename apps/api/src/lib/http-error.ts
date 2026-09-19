import type { ApiErrorCode } from "@huddle/shared";

export class HttpError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details: unknown;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const unauthenticated = () =>
  new HttpError(401, "UNAUTHENTICATED", "Sign in to continue.");

export const forbidden = (message: string) =>
  new HttpError(403, "FORBIDDEN", message);
