import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import * as cookie from "cookie";

import app from "./app.js";
import User from "./models/User.js";
import Chat from "./models/Chat.js";
import connectDB from "./config/db.js";

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

// Store connected sockets for each user.
const onlineUsers = new Map();

app.set("onlineUsers", onlineUsers);

// Authenticate Socket.IO connections.
io.use(async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;
    let token;

    if (cookieHeader) {
      const cookies = cookie.parse(cookieHeader);
      token = cookies.token;
    }

    // Support the backend test client.
    if (
      !token &&
      typeof socket.handshake.auth?.token === "string"
    ) {
      token = socket.handshake.auth.token;
    }

    if (!token) {
      return next(new Error("Authentication token missing"));
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure this matches the payload created by your login controller.
    const user = await User.findById(decoded.id).select("_id name");

    if (!user) {
      return next(new Error("User not found"));
    }

    socket.user = user;

    next();
  } catch (error) {
    console.error(
      "Socket authentication error:",
      error.name,
      error.message
    );

    next(new Error("Invalid or expired authentication token"));
  }
});

// Handle authenticated socket connections.
io.on("connection", (socket) => {
  const userId = socket.user._id.toString();

  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }

  onlineUsers.get(userId).add(socket.id);

  // Join the user's private room.
  socket.join(`user:${userId}`);

  socket.broadcast.emit("userOnline", { userId });

  console.log(`User connected: ${userId}`);

  // Join a conversation after verifying membership.
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

  // Leave a conversation.
  socket.on("leaveChat", (chatId) => {
    if (
      typeof chatId === "string" &&
      /^[a-fA-F0-9]{24}$/.test(chatId)
    ) {
      socket.leave(`chat:${chatId}`);
    }
  });

  // Handle disconnection.
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

// Connect to MongoDB before accepting requests.
async function startServer() {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();