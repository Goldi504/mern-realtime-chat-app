
import mongoose from "mongoose";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";

// POST /api/messages
// Send and save a message.
export const sendMessage = async (req, res) => {
  try {
    const { chatId, text } = req.body || {};
    const senderId = req.user?._id;

    if (!senderId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!mongoose.isValidObjectId(chatId)) {
      return res.status(400).json({
        success: false,
        message: "A valid chatId is required",
      });
    }

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message text cannot be empty",
      });
    }

    const cleanText = text.trim();

    if (cleanText.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Message cannot exceed 5000 characters",
      });
    }

    const chat = await Chat.findOne({
      _id: chatId,
      participants: senderId,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const createdMessage = await Message.create({
      chat: chat._id,
      sender: senderId,
      text: cleanText,
      messageType: "text",
      readBy: [senderId],
    });

    chat.latestMessage = createdMessage._id;
    await chat.save();

    const message = await Message.findById(createdMessage._id)
      .populate("sender", "name profilePic")
      .lean();

    const io = req.app.get("io");

    if (io) {
      const conversationId = chat._id.toString();

      io.to(`chat:${conversationId}`).emit("newMessage", message);

      for (const participantId of chat.participants) {
        io.to(`user:${participantId.toString()}`).emit("chatUpdated", {
          chatId: conversationId,
          latestMessage: message,
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error("Send message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
};

// GET /api/messages/:chatId
// Retrieve messages with pagination.
export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user?._id;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!mongoose.isValidObjectId(chatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
    }

    const chat = await Chat.findOne({
      _id: chatId,
      participants: currentUserId,
    }).select("_id");

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const parsedPage = Number.parseInt(req.query.page, 10);
    const parsedLimit = Number.parseInt(req.query.limit, 10);

    const page = Number.isNaN(parsedPage) ? 1 : parsedPage;
    const limit = Number.isNaN(parsedLimit) ? 30 : parsedLimit;

    if (
      !Number.isInteger(page) ||
      !Number.isInteger(limit) ||
      page < 1 ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Page must be positive and limit must be between 1 and 100",
      });
    }

    const [messages, totalMessages] = await Promise.all([
      Message.find({ chat: chat._id })
        .populate("sender", "name profilePic")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Message.countDocuments({ chat: chat._id }),
    ]);

    return res.status(200).json({
      success: true,
      messages: messages.reverse(),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit),
        totalMessages,
        limit,
      },
    });
  } catch (error) {
    console.error("Get messages error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve messages",
    });
  }
};

// PATCH /api/messages/:chatId/read
// Mark messages sent by other users as read.
export const markMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user?._id;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!mongoose.isValidObjectId(chatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
    }

    const chat = await Chat.findOne({
      _id: chatId,
      participants: currentUserId,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Mark only messages sent by other participants as read.
    const result = await Message.updateMany(
      {
        chat: chat._id,
        sender: { $ne: currentUserId },
        readBy: { $ne: currentUserId },
      },
      {
        $addToSet: { readBy: currentUserId },
      }
    );

    const io = req.app.get("io");

    const receipt = {
      chatId: chat._id.toString(),
      userId: currentUserId.toString(),
      modifiedCount: result.modifiedCount,
    };

    if (io) {
      // Notify devices in the conversation.
      io.to(`chat:${chat._id.toString()}`).emit(
        "messagesRead",
        receipt
      );

      // Notify each participant's devices, including those
      // that aren't currently viewing the conversation.
      for (const participantId of chat.participants) {
        io.to(`user:${participantId.toString()}`).emit(
          "messagesRead",
          receipt
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Messages marked as read",
      data: receipt,
    });
  } catch (error) {
    console.error("Mark messages as read error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark messages as read",
    });
  }
};

// GET /api/messages/unread-counts
// Return unread message counts for each conversation.
export const getUnreadCounts = async (req, res) => {
  try {
    const currentUserId = req.user?._id;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const counts = await Message.aggregate([
      {
        $match: {
          sender: { $ne: currentUserId },
          readBy: { $ne: currentUserId },
        },
      },
      {
        $lookup: {
          from: "chats",
          localField: "chat",
          foreignField: "_id",
          as: "conversation",
        },
      },
      { $unwind: "$conversation" },
      {
        $match: {
          "conversation.participants": currentUserId,
        },
      },
      {
        $group: {
          _id: "$chat",
          unreadCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          chatId: { $toString: "$_id" },
          unreadCount: 1,
        },
      },
    ]);

    const totalUnread = counts.reduce(
      (total, item) => total + item.unreadCount,
      0
    );

    return res.status(200).json({
      success: true,
      totalUnread,
      conversations: counts,
    });
  } catch (error) {
    console.error("Get unread counts error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve unread counts",
    });
  }
};
