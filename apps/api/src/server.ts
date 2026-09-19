import { createServer } from "node:http";

import { Server } from "socket.io";

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { logger } from "./lib/logger.js";

const app = createApp();
const httpServer = createServer(app);

// Real-time rooms and the authenticated handshake arrive in Phase 3; the
// server is created here so the transport is wired once.
const io = new Server(httpServer, {
  cors: {
    credentials: true,
    origin: env.WEB_ORIGIN,
  },
});

io.on("connection", (socket) => {
  socket.on("disconnect", () => undefined);
});

httpServer.listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT }, "Huddle API listening");
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down");
  io.close();
  httpServer.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
