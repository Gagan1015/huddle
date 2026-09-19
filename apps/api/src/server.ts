import { createServer } from "node:http";

import { Server } from "socket.io";

import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    credentials: true,
    origin: env.WEB_ORIGIN,
  },
});

io.on("connection", (socket) => {
  socket.on("disconnect", () => undefined);
});

httpServer.listen(env.API_PORT);
