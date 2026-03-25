const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

// ---------------- ROOM STATE ----------------
// { roomId: { videoId, currentTime, isPlaying } }
const rooms = {};

// ---------------- SOCKET ----------------
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // -------- JOIN ROOM --------
  socket.on("join-room", ({ roomId }) => {
    socket.join(roomId);

    // Send current state to new user
    if (rooms[roomId]) {
      socket.emit("sync-state", rooms[roomId]);
    }
  });

  // -------- LOAD VIDEO --------
  socket.on("load-video", ({ roomId, videoId }) => {
    rooms[roomId] = {
      videoId,
      currentTime: 0,
      isPlaying: false
    };

    io.to(roomId).emit("load-video", { videoId });
  });

  // -------- PLAY --------
  socket.on("play", ({ roomId, time }) => {
    if (!rooms[roomId]) return;

    rooms[roomId].isPlaying = true;
    rooms[roomId].currentTime = time;

    socket.to(roomId).emit("play", { time });
  });

  // -------- PAUSE --------
  socket.on("pause", ({ roomId, time }) => {
    if (!rooms[roomId]) return;

    rooms[roomId].isPlaying = false;
    rooms[roomId].currentTime = time;

    socket.to(roomId).emit("pause", { time });
  });

  // -------- SEEK --------
  socket.on("seek", ({ roomId, time }) => {
    if (!rooms[roomId]) return;

    rooms[roomId].currentTime = time;

    socket.to(roomId).emit("seek", { time });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// -------- OPTIONAL: KEEP TIME UPDATED --------
setInterval(() => {
  for (const roomId in rooms) {
    if (rooms[roomId].isPlaying) {
      rooms[roomId].currentTime += 1;
    }
  }
}, 1000);

// ---------------- START ----------------
server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});