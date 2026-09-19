import {
  createBoardInputSchema,
  createOrganizationInputSchema,
  idSchema,
  updateOrganizationInputSchema,
} from "@huddle/shared";
import { Router } from "express";
import { z } from "zod";

import { getSessionUser } from "../../auth/session.js";
import { parseOrThrow } from "../../lib/validate.js";
import { createBoard, listBoards } from "../boards/boards.service.js";
import {
  createOrganization,
  getMe,
  getOrganization,
  listMembers,
  listOrganizationsForUser,
  updateOrganization,
} from "./organizations.service.js";

const organizationParams = z.object({ organizationId: idSchema });

export const meRouter: Router = Router();

meRouter.get("/me", async (_request, response) => {
  response.json(await getMe(getSessionUser(response)));
});

export const organizationsRouter: Router = Router();

organizationsRouter.get("/", async (_request, response) => {
  const user = getSessionUser(response);
  response.json(await listOrganizationsForUser(user.id));
});

organizationsRouter.post("/", async (request, response) => {
  const user = getSessionUser(response);
  const input = parseOrThrow(createOrganizationInputSchema, request.body);
  response.status(201).json(await createOrganization(user.id, input));
});

organizationsRouter.get("/:organizationId", async (request, response) => {
  const user = getSessionUser(response);
  const { organizationId } = parseOrThrow(organizationParams, request.params);
  response.json(await getOrganization(user.id, organizationId));
});

organizationsRouter.patch("/:organizationId", async (request, response) => {
  const user = getSessionUser(response);
  const { organizationId } = parseOrThrow(organizationParams, request.params);
  const input = parseOrThrow(updateOrganizationInputSchema, request.body);
  response.json(await updateOrganization(user.id, organizationId, input));
});

organizationsRouter.get(
  "/:organizationId/members",
  async (request, response) => {
    const user = getSessionUser(response);
    const { organizationId } = parseOrThrow(organizationParams, request.params);
    response.json(await listMembers(user.id, organizationId));
  },
);

organizationsRouter.get(
  "/:organizationId/boards",
  async (request, response) => {
    const user = getSessionUser(response);
    const { organizationId } = parseOrThrow(organizationParams, request.params);
    response.json(await listBoards(user.id, organizationId));
  },
);

organizationsRouter.post(
  "/:organizationId/boards",
  async (request, response) => {
    const user = getSessionUser(response);
    const { organizationId } = parseOrThrow(organizationParams, request.params);
    const input = parseOrThrow(createBoardInputSchema, request.body);
    response
      .status(201)
      .json(await createBoard(user.id, organizationId, input));
  },
);
