import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import { env } from "./config/env.js";

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
  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp());

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  return app;
}
