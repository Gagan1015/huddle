import {
  createIssueInputSchema,
  deleteColumnInputSchema,
  idSchema,
  moveColumnInputSchema,
  updateColumnInputSchema,
} from "@huddle/shared";
import { Router } from "express";
import { z } from "zod";

import { getSessionUser } from "../../auth/session.js";
import { parseOrThrow } from "../../lib/validate.js";
import { createIssue } from "../issues/issues.service.js";
import { deleteColumn, moveColumn, renameColumn } from "./columns.service.js";

const columnParams = z.object({ columnId: idSchema });

export const columnsRouter: Router = Router();

columnsRouter.patch("/:columnId", async (request, response) => {
  const user = getSessionUser(response);
  const { columnId } = parseOrThrow(columnParams, request.params);
  const input = parseOrThrow(updateColumnInputSchema, request.body);
  response.json(await renameColumn(user.id, columnId, input));
});

columnsRouter.post("/:columnId/move", async (request, response) => {
  const user = getSessionUser(response);
  const { columnId } = parseOrThrow(columnParams, request.params);
  const input = parseOrThrow(moveColumnInputSchema, request.body);
  response.json(await moveColumn(user.id, columnId, input));
});

columnsRouter.delete("/:columnId", async (request, response) => {
  const user = getSessionUser(response);
  const { columnId } = parseOrThrow(columnParams, request.params);
  const input = parseOrThrow(deleteColumnInputSchema, request.body ?? {});
  response.json(await deleteColumn(user.id, columnId, input));
});

columnsRouter.post("/:columnId/issues", async (request, response) => {
  const user = getSessionUser(response);
  const { columnId } = parseOrThrow(columnParams, request.params);
  const input = parseOrThrow(createIssueInputSchema, request.body);
  response.status(201).json(await createIssue(user.id, columnId, input));
});
