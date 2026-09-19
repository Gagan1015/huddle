import {
  createColumnInputSchema,
  idSchema,
  updateBoardInputSchema,
} from "@huddle/shared";
import { Router } from "express";
import { z } from "zod";

import { getSessionUser } from "../../auth/session.js";
import { parseOrThrow } from "../../lib/validate.js";
import { createColumn } from "../columns/columns.service.js";
import { deleteBoard, getBoardDetail, updateBoard } from "./boards.service.js";

const boardParams = z.object({ boardId: idSchema });

export const boardsRouter: Router = Router();

boardsRouter.get("/:boardId", async (request, response) => {
  const user = getSessionUser(response);
  const { boardId } = parseOrThrow(boardParams, request.params);
  response.json(await getBoardDetail(user.id, boardId));
});

boardsRouter.patch("/:boardId", async (request, response) => {
  const user = getSessionUser(response);
  const { boardId } = parseOrThrow(boardParams, request.params);
  const input = parseOrThrow(updateBoardInputSchema, request.body);
  response.json(await updateBoard(user.id, boardId, input));
});

boardsRouter.delete("/:boardId", async (request, response) => {
  const user = getSessionUser(response);
  const { boardId } = parseOrThrow(boardParams, request.params);
  response.json(await deleteBoard(user.id, boardId));
});

boardsRouter.post("/:boardId/columns", async (request, response) => {
  const user = getSessionUser(response);
  const { boardId } = parseOrThrow(boardParams, request.params);
  const input = parseOrThrow(createColumnInputSchema, request.body);
  response.status(201).json(await createColumn(user.id, boardId, input));
});
