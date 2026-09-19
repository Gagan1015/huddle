import type { ApiErrorBody } from "@huddle/shared";
import type { ErrorRequestHandler, RequestHandler } from "express";

import { Prisma } from "../generated/prisma/client.js";
import { HttpError } from "../lib/http-error.js";

function send(
  response: Parameters<ErrorRequestHandler>[2],
  status: number,
  body: ApiErrorBody["error"],
) {
  response.status(status).json({ error: body } satisfies ApiErrorBody);
}

function isBodyParserError(
  error: unknown,
): error is { type: string; status?: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    typeof (error as { type: unknown }).type === "string"
  );
}

export const notFoundHandler: RequestHandler = (_request, response) => {
  send(response, 404, {
    code: "NOT_FOUND",
    message: "That route does not exist.",
  });
};

export const errorHandler: ErrorRequestHandler = (
  error,
  request,
  response,
  _next,
) => {
  if (error instanceof HttpError) {
    send(response, error.status, {
      code: error.code,
      message: error.message,
      ...(error.details !== undefined && { details: error.details }),
    });
    return;
  }

  if (isBodyParserError(error)) {
    if (error.type === "entity.parse.failed") {
      send(response, 400, {
        code: "VALIDATION_ERROR",
        message: "The request body is not valid JSON.",
      });
      return;
    }

    if (error.type === "entity.too.large") {
      send(response, 413, {
        code: "VALIDATION_ERROR",
        message: "The request body is too large.",
      });
      return;
    }
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      send(response, 409, {
        code: "CONFLICT",
        message: "Something with the same name already exists.",
      });
      return;
    }

    if (error.code === "P2025") {
      send(response, 404, {
        code: "NOT_FOUND",
        message: "That item is no longer available.",
      });
      return;
    }
  }

  request.log.error({ err: error }, "Unhandled request error");
  send(response, 500, {
    code: "INTERNAL_ERROR",
    message: "Something unexpected happened. Please try again.",
  });
};
