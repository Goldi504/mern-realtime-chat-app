import http from "http";
import app from "./app.js";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import "dotenv/config";

import User from "./models/User.js";
import Chat from "./models/Chat.js";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  },
});

// Make Socket.IO available to Express controllers.
app.set("io", io);

// Authenticate socket connections using the HTTP-only JWT cookie.
io.use(async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;

    if (!cookieHeader) {
      return next(new Error("Authentication required"));
    }

    const cookies = cookie.parse(cookieHeader);
    const token = cookies.token;

    if (!token) {
      return next(new Error("Authentication token missing"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("_id name");

    if (!user) {
      return next(new Error("User not found"));
    }

    socket.user = user;

    next();
  } catch (error) {
    next(new Error("Invalid or expired authentication token"));
  }
});

// Store connected sockets for each user.
// A user may have multiple tabs or devices connected.
const onlineUsers = new Map();

io.on("connection", (socket) => {
  const userId = socket.user._id.toString();

  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }

  onlineUsers.get(userId).add(socket.id);

  // Join the user's private room.
  socket.join(`user:${userId}`);

  // Notify other connected clients that this user is online.
  socket.broadcast.emit("userOnline", { userId });

  console.log(`User connected: ${userId}`);

  // Join a conversation only after verifying membership.
  socket.on("joinChat", async (chatId, callback) => {
    try {
      if (
        typeof chatId !== "string" ||
        !/^[a-fA-F0-9]{24}$/.test(chatId)
      ) {
        return callback?.({
          success: false,
          message: "Invalid conversation ID",
        });
      }

      const chat = await Chat.exists({
        _id: chatId,
        participants: socket.user._id,
      });

      if (!chat) {
        return callback?.({
          success: false,
          message: "Conversation not found or access denied",
        });
      }

      socket.join(`chat:${chatId}`);

      return callback?.({
        success: true,
        message: "Joined conversation successfully",
      });
    } catch (error) {
      console.error("Join chat error:", error);

      return callback?.({
        success: false,
        message: "Failed to join conversation",
      });
    }
  });

  // Leave a conversation room.
  socket.on("leaveChat", (chatId) => {
    if (typeof chatId === "string") {
      socket.leave(`chat:${chatId}`);
    }
  });

  socket.on("disconnect", () => {
    const userSockets = onlineUsers.get(userId);

    if (userSockets) {
      userSockets.delete(socket.id);

      if (userSockets.size === 0) {
        onlineUsers.delete(userId);

        socket.broadcast.emit("userOffline", {
          userId,
          lastSeen: new Date().toISOString(),
        });
      }
    }

    console.log(`User disconnected: ${userId}`);
  });
});

// Allow other backend modules to access online user information.
app.set("onlineUsers", onlineUsers);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});