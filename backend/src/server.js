
import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import * as cookie from "cookie";

import app from "./app.js";
import User from "./models/User.js";
import Chat from "./models/Chat.js";
import Message from "./models/Message.js";
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

// --------------------------------------------------
// SOCKET AUTHENTICATION
// --------------------------------------------------

io.use(async (socket, next) => {
  try {
    let token;

    // Read the HTTP-only cookie.
    const cookieHeader = socket.handshake.headers.cookie;

    if (cookieHeader) {
      token = cookie.parse(cookieHeader).token;
    }

    // Also support JWT authentication through socket.handshake.auth.
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

// --------------------------------------------------
// AUTHENTICATED SOCKET CONNECTION
// --------------------------------------------------

io.on("connection", (socket) => {
  const userId = socket.user._id.toString();

  console.log(
    `Socket connected: user=${userId}, socket=${socket.id}`
  );

  // Track connections for each user.
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }

  const userSockets = onlineUsers.get(userId);
  const wasOffline = userSockets.size === 0;

  userSockets.add(socket.id);

  // Every connection joins its private user room immediately.
  socket.join(`user:${userId}`);

  // Update online status without blocking event-handler registration.
  if (wasOffline) {
    User.findByIdAndUpdate(userId, {
      $set: { isOnline: true },
    })
      .then(() => {
        io.emit("userOnline", { userId });
      })
      .catch((error) => {
        console.error("Online status update error:", error.message);
      });
  }

  // ------------------------------------------------
  // JOIN CHAT
  // ------------------------------------------------

  socket.on("joinChat", async (payload = {}, callback) => {
    const respond = (data) => {
      if (typeof callback === "function") {
        callback(data);
      }
    };

    try {
      const chatId = payload?.chatId;

      console.log(
        "joinChat received:",
        chatId,
        "user:",
        userId
      );

      if (
        typeof chatId !== "string" ||
        !/^[a-fA-F0-9]{24}$/.test(chatId)
      ) {
        return respond({
          success: false,
          message: "Invalid chat ID",
        });
      }

      const isMember = await Chat.exists({
        _id: chatId,
        participants: socket.user._id,
      });

      if (!isMember) {
        console.log(
          `joinChat rejected: user ${userId} is not a member of ${chatId}`
        );

        return respond({
          success: false,
          message: "You are not a member of this chat",
        });
      }

      await socket.join(`chat:${chatId}`);

      console.log(
        `User ${userId} joined chat ${chatId}`
      );

      return respond({
        success: true,
        message: "Joined chat successfully",
      });
    } catch (error) {
      console.error("joinChat error:", error);

      return respond({
        success: false,
        message: "Failed to join chat",
      });
    }
  });

  // ------------------------------------------------
  // LEAVE CHAT
  // ------------------------------------------------

  socket.on("leaveChat", async (chatId, callback) => {
    const respond = (data) => {
      if (typeof callback === "function") {
        callback(data);
      }
    };

    try {
      if (
        typeof chatId !== "string" ||
        !/^[a-fA-F0-9]{24}$/.test(chatId)
      ) {
        return respond({
          success: false,
          message: "Invalid conversation ID",
        });
      }

      const isMember = await Chat.exists({
        _id: chatId,
        participants: socket.user._id,
      });

      if (!isMember) {
        return respond({
          success: false,
          message: "Conversation not found or access denied",
        });
      }

      await socket.leave(`chat:${chatId}`);

      return respond({
        success: true,
        message: "Left conversation successfully",
      });
    } catch (error) {
      console.error("Leave conversation error:", error);

      return respond({
        success: false,
        message: "Failed to leave conversation",
      });
    }
  });

  // ------------------------------------------------
  // TYPING INDICATOR
  // ------------------------------------------------

  socket.on("typing", async (payload = {}) => {
    try {
      const chatId = payload?.chatId;

      if (
        typeof chatId !== "string" ||
        !/^[a-fA-F0-9]{24}$/.test(chatId)
      ) {
        return;
      }

      const isMember = await Chat.exists({
        _id: chatId,
        participants: socket.user._id,
      });

      if (!isMember) {
        return;
      }

      socket.to(`chat:${chatId}`).emit("userTyping", {
        chatId,
        userId,
        name: socket.user.name,
      });
    } catch (error) {
      console.error("Typing event error:", error.message);
    }
  });

  // ------------------------------------------------
  // STOP TYPING
  // ------------------------------------------------

  socket.on("stopTyping", async (payload = {}) => {
    try {
      const chatId = payload?.chatId;

      if (
        typeof chatId !== "string" ||
        !/^[a-fA-F0-9]{24}$/.test(chatId)
      ) {
        return;
      }

      const isMember = await Chat.exists({
        _id: chatId,
        participants: socket.user._id,
      });

      if (!isMember) {
        return;
      }

      socket.to(`chat:${chatId}`).emit("userStoppedTyping", {
        chatId,
        userId,
      });
    } catch (error) {
      console.error("Stop typing error:", error.message);
    }
  });

  // ------------------------------------------------
  // MESSAGE DELIVERY ACKNOWLEDGMENT
  // ------------------------------------------------

  socket.on("messageDelivered", async (messageId, callback) => {
    const respond = (data) => {
      if (typeof callback === "function") {
        callback(data);
      }
    };

    try {
      if (
        typeof messageId !== "string" ||
        !/^[a-fA-F0-9]{24}$/.test(messageId)
      ) {
        return respond({
          success: false,
          message: "Invalid message ID",
        });
      }

      const message = await Message.findById(messageId).select(
        "_id chat sender deliveredTo"
      );

      if (!message) {
        return respond({
          success: false,
          message: "Message not found",
        });
      }

      const currentUserId = socket.user._id.toString();
      const senderId = message.sender.toString();

      // The sender cannot acknowledge their own message.
      if (senderId === currentUserId) {
        return respond({
          success: false,
          message: "Only a recipient can acknowledge delivery",
        });
      }

      // Verify that the recipient belongs to this conversation.
      const isMember = await Chat.exists({
        _id: message.chat,
        participants: socket.user._id,
      });

      if (!isMember) {
        return respond({
          success: false,
          message: "Conversation access denied",
        });
      }

      await Message.updateOne(
        {
          _id: message._id,
          sender: { $ne: socket.user._id },
        },
        {
          $addToSet: {
            deliveredTo: socket.user._id,
          },
        }
      );

      const deliveryData = {
        messageId: message._id.toString(),
        chatId: message.chat.toString(),
        userId: currentUserId,
        deliveredAt: new Date().toISOString(),
      };

      // Notify all clients in the conversation.
      io.to(`chat:${deliveryData.chatId}`).emit(
        "messageDelivered",
        deliveryData
      );

      // Notify the sender's connected clients.
      io.to(`user:${senderId}`).emit(
        "messageDelivered",
        deliveryData
      );

      return respond({
        success: true,
        message: "Delivery acknowledged",
        data: deliveryData,
      });
    } catch (error) {
      console.error(
        "Message delivery acknowledgement error:",
        error
      );

      return respond({
        success: false,
        message: "Failed to acknowledge message delivery",
      });
    }
  });

  // ------------------------------------------------
  // DISCONNECT
  // ------------------------------------------------

  socket.on("disconnect", () => {
    const sockets = onlineUsers.get(userId);

    if (!sockets) {
      return;
    }

    sockets.delete(socket.id);

    // Do not mark offline if another session is connected.
    if (sockets.size > 0) {
      return;
    }

    onlineUsers.delete(userId);

    const lastSeen = new Date();

    User.findByIdAndUpdate(userId, {
      $set: {
        isOnline: false,
        lastSeen,
      },
    })
      .then(() => {
        io.emit("userOffline", {
          userId,
          lastSeen: lastSeen.toISOString(),
        });

        console.log(`Socket disconnected: user=${userId}`);
      })
      .catch((error) => {
        console.error(
          "Offline status update error:",
          error.message
        );
      });
  });
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

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
