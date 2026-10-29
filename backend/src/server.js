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

app.set("io", io);

// userId -> Set of connected socket IDs
const onlineUsers = new Map();

app.set("onlineUsers", onlineUsers);

// Authenticate every Socket.IO connection.
io.use(async (socket, next) => {
  try {
    let token;

    // Browser connections may authenticate using the HTTP-only cookie.
    const cookieHeader = socket.handshake.headers.cookie;

    if (cookieHeader) {
      token = cookie.parse(cookieHeader).token;
    }

    // Also support clients that explicitly provide a bearer token.
    if (!token && typeof socket.handshake.auth?.token === "string") {
      token = socket.handshake.auth.token;
    }

    if (!token) {
      return next(new Error("Authentication token missing"));
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.id) {
      return next(new Error("Invalid authentication token"));
    }

    const user = await User.findById(decoded.id).select(
      "_id name profilePic"
    );

    if (!user) {
      return next(new Error("User not found"));
    }

    socket.user = user;

    next();
  } catch (error) {
    console.error(
      "Socket authentication failed:",
      error.name,
      error.message
    );

    next(new Error("Invalid or expired authentication token"));
  }
});

// Handle authenticated connections.
io.on("connection", async (socket) => {
  const userId = socket.user._id.toString();

  try {
    // Track all connections belonging to this user.
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }

    const userSockets = onlineUsers.get(userId);
    const wasOffline = userSockets.size === 0;

    userSockets.add(socket.id);

    // Every connection automatically joins its private user room.
    socket.join(`user:${userId}`);

    // Update online status only on the first active connection.
    if (wasOffline) {
      await User.findByIdAndUpdate(userId, {
        $set: { isOnline: true },
      });

      io.emit("userOnline", { userId });
    }

    console.log(`Socket connected: user=${userId}, socket=${socket.id}`);

    // Join a conversation only after checking membership.
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

        const isMember = await Chat.exists({
          _id: chatId,
          participants: socket.user._id,
        });

        if (!isMember) {
          return callback?.({
            success: false,
            message: "Conversation not found or access denied",
          });
        }

        await socket.join(`chat:${chatId}`);

        return callback?.({
          success: true,
          message: "Joined conversation successfully",
          chatId,
        });
      } catch (error) {
        console.error("Join conversation error:", error);

        return callback?.({
          success: false,
          message: "Failed to join conversation",
        });
      }
    });

    // Leave a conversation.
    socket.on("leaveChat", async (chatId, callback) => {
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

        await socket.leave(`chat:${chatId}`);

        return callback?.({
          success: true,
          message: "Left conversation successfully",
        });
      } catch (error) {
        console.error("Leave conversation error:", error);

        return callback?.({
          success: false,
          message: "Failed to leave conversation",
        });
      }
    });

    // Handle disconnection without marking other active sessions offline.
    socket.on("disconnect", async () => {
      try {
        const sockets = onlineUsers.get(userId);

        if (!sockets) {
          return;
        }

        sockets.delete(socket.id);

        // A user may have multiple tabs or devices connected.
        if (sockets.size > 0) {
          return;
        }

        onlineUsers.delete(userId);

        const lastSeen = new Date();

        await User.findByIdAndUpdate(userId, {
          $set: {
            isOnline: false,
            lastSeen,
          },
        });

        io.emit("userOffline", {
          userId,
          lastSeen: lastSeen.toISOString(),
        });

        console.log(`Socket disconnected: user=${userId}`);
      } catch (error) {
        console.error("Disconnect handling error:", error);
      }
    });
  } catch (error) {
    console.error("Socket connection setup failed:", error);

    socket.disconnect(true);
  }
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