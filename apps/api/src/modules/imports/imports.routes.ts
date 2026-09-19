import { idSchema, importNotesInputSchema } from "@huddle/shared";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";

import { getSessionUser } from "../../auth/session.js";
import { parseOrThrow } from "../../lib/validate.js";
import { importMeetingNotes } from "./imports.service.js";

const boardParams = z.object({ boardId: idSchema });

// Every import is a paid model call that takes seconds, so the limit is per
// signed-in user rather than per address.
const importRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (_request, response) => getSessionUser(response).id,
  message: {
    error: {
      code: "RATE_LIMITED",
      message:
        "You have imported notes many times in a row. Wait a few minutes and try again.",
    },
  },
});

export const importsRouter: Router = Router();

importsRouter.post(
  "/:boardId/imports/meeting-notes",
  importRateLimiter,
  async (request, response) => {
    const user = getSessionUser(response);
    const { boardId } = parseOrThrow(boardParams, request.params);
    const input = parseOrThrow(
      importNotesInputSchema,
      request.body,
      "meeting notes",
    );
    response
      .status(201)
      .json(await importMeetingNotes(user.id, boardId, input));
  },
);
