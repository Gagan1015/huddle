import { apiErrorSchema, type ApiErrorCode } from "@huddle/shared";

/** Absolute API origin for split deployments; empty means same-origin (Vite proxy in dev). */
export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(
  /\/$/,
  "",
);

export type ApiErrorKind = ApiErrorCode | "UNKNOWN" | "NETWORK";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorKind;
  readonly details: unknown;

  constructor(
    status: number,
    code: ApiErrorKind,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(error: unknown, status?: number): error is ApiError {
  return (
    error instanceof ApiError &&
    (status === undefined || error.status === status)
  );
}

export function errorMessage(
  error: unknown,
  fallback = "Something went wrong.",
) {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  json?: unknown;
}

function parseBody(text: string): unknown {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { json, headers, ...init } = options;
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      ...init,
      headers: {
        Accept: "application/json",
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK",
      "Can't reach Huddle right now. Check your connection and try again.",
    );
  }

  const data = parseBody(await response.text());

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(data);
    if (parsed.success) {
      const { code, message, details } = parsed.data.error;
      throw new ApiError(response.status, code, message, details);
    }

    // Better Auth responds with `{ code, message }` rather than the API envelope.
    const message =
      isRecord(data) && typeof data.message === "string"
        ? data.message
        : `The request failed (${response.status}).`;
    throw new ApiError(response.status, "UNKNOWN", message);
  }

  return data as T;
}
