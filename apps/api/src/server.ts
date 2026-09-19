import { createServer } from "node:http";

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { logger } from "./lib/logger.js";
import { setBoardEventPublisher } from "./realtime/board-events.js";
import { createSocketPublisher } from "./realtime/socket-publisher.js";
import { createRealtimeServer } from "./realtime/socket-server.js";

const app = createApp();
const httpServer = createServer(app);

// Domain services publish after commit; the socket server fans out to rooms.
const io = createRealtimeServer(httpServer);
setBoardEventPublisher(createSocketPublisher(io));

httpServer.listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT }, "Huddle API listening");
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down");
  setBoardEventPublisher(null);
  io.close();
  httpServer.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
