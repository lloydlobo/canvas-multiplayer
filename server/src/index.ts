//
import express from "express";
import http from "http";
import { v4 as uuidv4 } from "uuid";

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || "8080";

import { Server } from "socket.io";

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

type Point = {
  x: number;
  y: number;
};

type DrawLine = {
  previousPoint: Point;
  currentPoint: Point;
  color: string;
};

app.use(express.json());

app.get("/", async (req, res) => {
  const welcomeMessage = `<h1>canvas multiplayer</h1>`;
  res.send(welcomeMessage);
});

io.on("connection", (socket) => {
  const uuid = uuidv4();

  const msgConnect = `${socket.id} connected`;
  console.info(msgConnect);
  socket.emit("message", `Welcome to the server!`);
  socket.broadcast.emit("message", "A new user has joined");
  socket.on("chat_message", (msg) => {
    io.emit("chat_message", msg);
  });

  socket.on("client_ready", () => {
    console.info(`client_ready: ${socket.id}. emitting get_canvas_state`);
    socket.broadcast.emit("get_canvas_state");
  });
  socket.on("canvas_state", (state) => {
    console.info(`received_canvas_state for ${socket.id}: ${state.length}`);
    socket.broadcast.emit("canvas_state_from_server", state);
  });
  socket.on("draw_line", ({ previousPoint, currentPoint, color }: DrawLine) => {
    socket.broadcast.emit("draw_line", { previousPoint, currentPoint, color });
  });
  socket.on("clear", () => {
    console.info(`clear: ${socket.id}`);
    io.emit("clear");
  });

  socket.on("disconnect", () => {
    const msgDisconnect = `${socket.id} disconnected`;

    console.info(msgDisconnect);
    io.emit("client_ready", msgDisconnect);
  });
});

server.listen(8080, () => {
  console.info(`✔️ Server listening on port ${PORT}`);
});
