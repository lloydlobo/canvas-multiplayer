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

app.use(express.json());

app.get("/", async (req, res) => {
  const welcomeMessage = `<h1>canvas multiplayer</h1>`;
  res.send(welcomeMessage);
});

io.on("connection", (socket) => {
  const uuid = uuidv4();
  socket.on("client-ready", () => {
    console.log(`client-ready: ${socket.id}`);
    socket.broadcast.emit("get-canvas-state");
  });

  const msgConnect = `${socket.id} connected`;
  console.log(msgConnect);

  socket.emit("message", `Welcome to the server!`);
  socket.broadcast.emit("message", "A new user has joined");

  socket.on("chat_message", (msg) => {
    io.emit("chat_message", msg);
  });

  socket.on("clear", () => io.emit("clear"));

  socket.on("disconnect", () => {
    const msgDisconnect = `${socket.id} disconnected`;

    console.log(msgDisconnect);
    io.emit("client-ready", msgDisconnect);
  });
});

server.listen(8080, () => {
  console.log(`✔️ Server listening on port ${PORT}`);
});
