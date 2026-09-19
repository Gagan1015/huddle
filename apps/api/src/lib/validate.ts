import type { z } from "zod";

import { HttpError } from "./http-error.js";

export function parseOrThrow<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
  subject = "request",
): z.output<Schema> {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      `The ${subject} is invalid.`,
      result.error.issues.map((issue) => ({
        path: issue.path.map(String).join("."),
        message: issue.message,
      })),
    );
  }

  return result.data;
}
