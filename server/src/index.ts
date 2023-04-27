//
import express from "express";
import http from "http";
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || "8080";

import { Server } from "socket.io";

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.get("/", async (req, res) => {
  const welcomeMessage = `<h1>canvas-multiplayer</h1>`;
  res.send(welcomeMessage);
});

io.on("connection", (socket) => {
  socket.on("client-ready", () => {
    socket.broadcast.emit("get-canvas-state");
  });

  socket.on("clear", () => io.emit("clear"));

  socket.on("disconnect", () => {
    console.log(`User disconnected`);
    io.emit("client-ready", "A user has left");
  });
});

server.listen(8080, () => {
  console.log(`✔️ Server listening on port ${PORT}`);
});
