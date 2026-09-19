import {
  idSchema,
  moveIssueInputSchema,
  updateIssueInputSchema,
} from "@huddle/shared";
import { Router } from "express";
import { z } from "zod";

import { getSessionUser } from "../../auth/session.js";
import { parseOrThrow } from "../../lib/validate.js";
import {
  deleteIssue,
  getIssue,
  moveIssue,
  updateIssue,
} from "./issues.service.js";

const issueParams = z.object({ issueId: idSchema });

export const issuesRouter: Router = Router();

issuesRouter.get("/:issueId", async (request, response) => {
  const user = getSessionUser(response);
  const { issueId } = parseOrThrow(issueParams, request.params);
  response.json(await getIssue(user.id, issueId));
});

issuesRouter.patch("/:issueId", async (request, response) => {
  const user = getSessionUser(response);
  const { issueId } = parseOrThrow(issueParams, request.params);
  const input = parseOrThrow(updateIssueInputSchema, request.body);
  response.json(await updateIssue(user.id, issueId, input));
});

issuesRouter.post("/:issueId/move", async (request, response) => {
  const user = getSessionUser(response);
  const { issueId } = parseOrThrow(issueParams, request.params);
  const input = parseOrThrow(moveIssueInputSchema, request.body);
  response.json(await moveIssue(user.id, issueId, input));
});

issuesRouter.delete("/:issueId", async (request, response) => {
  const user = getSessionUser(response);
  const { issueId } = parseOrThrow(issueParams, request.params);
  response.json(await deleteIssue(user.id, issueId));
});
