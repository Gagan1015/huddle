import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express, { Router, type Express } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import { auth } from "./auth/auth.js";
import { requireSession } from "./auth/session.js";
import { env, isGoogleAuthEnabled, isImportEnabled } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./http/error-handler.js";
import { logger } from "./lib/logger.js";
import { boardsRouter } from "./modules/boards/boards.routes.js";
import { columnsRouter } from "./modules/columns/columns.routes.js";
import { importsRouter } from "./modules/imports/imports.routes.js";
import {
  invitationsRouter,
  organizationInvitationsRouter,
} from "./modules/invitations/invitations.routes.js";
import { issuesRouter } from "./modules/issues/issues.routes.js";
import {
  meRouter,
  organizationsRouter,
} from "./modules/organizations/organizations.routes.js";

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many sign-in attempts. Try again in a few minutes.",
    },
  },
});

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      credentials: true,
      origin: env.WEB_ORIGIN,
    }),
  );
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (request) => request.url === "/api/health" },
    }),
  );

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  // Safe, non-secret flags the sign-in page needs before a session exists.
  app.get("/api/public-config", (_request, response) => {
    response.json({
      auth: { emailAndPassword: true, google: isGoogleAuthEnabled },
      features: { meetingNotesImport: isImportEnabled },
    });
  });

  // Better Auth parses its own bodies, so it is mounted before express.json().
  app.use("/api/auth", authRateLimiter);
  app.all("/api/auth/{*any}", toNodeHandler(auth));

  app.use(express.json({ limit: "1mb" }));

  const api = Router();
  api.use(requireSession);
  api.use(meRouter);
  api.use("/organizations", organizationsRouter);
  api.use(
    "/organizations/:organizationId/invitations",
    organizationInvitationsRouter,
  );
  api.use("/invitations", invitationsRouter);
  api.use("/boards", boardsRouter);
  api.use("/boards", importsRouter);
  api.use("/columns", columnsRouter);
  api.use("/issues", issuesRouter);
  app.use("/api", api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
