
import mongoose from "mongoose";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";

// Helper: check whether the current user belongs to a conversation.
const findUserChat = async (chatId, userId) => {
  if (!mongoose.isValidObjectId(chatId)) {
    return null;
  }

  return Chat.findOne({
    _id: chatId,
    participants: userId,
  });
};

// Helper: emit an event to conversation members and their devices.
const emitToChat = (io, chat, event, data) => {
  if (!io) return;

  const chatId = chat._id.toString();

  io.to(`chat:${chatId}`).emit(event, data);

  for (const participantId of chat.participants) {
    io.to(`user:${participantId.toString()}`).emit(event, data);
  }
};

// POST /api/messages
// Send and save a text message.
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

    const chat = await findUserChat(chatId, senderId);

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
      deliveredTo: [],
      edited: false,
      editedAt: null,
      deletedFor: [],
      isDeletedForEveryone: false,
    });

    chat.latestMessage = createdMessage._id;
    await chat.save();

    const message = await Message.findById(createdMessage._id)
      .populate("sender", "name profilePic")
      .lean();

    const io = req.app.get("io");

    emitToChat(io, chat, "newMessage", message);

    emitToChat(io, chat, "chatUpdated", {
      chatId: chat._id.toString(),
      latestMessage: message,
    });

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
// Messages hidden by the current user are excluded.
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

    const chat = await findUserChat(chatId, currentUserId);

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

    const messageFilter = {
      chat: chat._id,
      deletedFor: { $ne: currentUserId },
    };

    const [messages, totalMessages] = await Promise.all([
      Message.find(messageFilter)
        .populate("sender", "name profilePic")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Message.countDocuments(messageFilter),
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
// Mark messages from other users as read.
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

    const chat = await findUserChat(chatId, currentUserId);

    if (!chat) {
      return res.status(
        mongoose.isValidObjectId(chatId) ? 404 : 400
      ).json({
        success: false,
        message: mongoose.isValidObjectId(chatId)
          ? "Conversation not found"
          : "Invalid conversation ID",
      });
    }

    const result = await Message.updateMany(
      {
        chat: chat._id,
        sender: { $ne: currentUserId },
        readBy: { $ne: currentUserId },
        isDeletedForEveryone: { $ne: true },
        deletedFor: { $ne: currentUserId },
      },
      {
        $addToSet: {
          readBy: currentUserId,
        },
      }
    );

    const receipt = {
      chatId: chat._id.toString(),
      userId: currentUserId.toString(),
      modifiedCount: result.modifiedCount,
    };

    emitToChat(
      req.app.get("io"),
      chat,
      "messagesRead",
      receipt
    );

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
          deletedFor: { $ne: currentUserId },
          isDeletedForEveryone: { $ne: true },
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

// PUT /api/messages/:messageId
// Edit your own text message.
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body || {};
    const currentUserId = req.user?._id;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid message ID",
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

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (message.sender.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own messages",
      });
    }

    if (
      message.isDeletedForEveryone ||
      message.deletedFor?.some(
        (id) => id.toString() === currentUserId.toString()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Deleted messages cannot be edited",
      });
    }

    if (message.messageType !== "text") {
      return res.status(400).json({
        success: false,
        message: "Only text messages can be edited",
      });
    }

    const chat = await findUserChat(
      message.chat.toString(),
      currentUserId
    );

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    message.text = cleanText;
    message.edited = true;
    message.editedAt = new Date();

    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate("sender", "name profilePic")
      .lean();

    emitToChat(
      req.app.get("io"),
      chat,
      "messageEdited",
      updatedMessage
    );

    return res.status(200).json({
      success: true,
      message: "Message edited successfully",
      data: updatedMessage,
    });
  } catch (error) {
    console.error("Edit message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to edit message",
    });
  }
};

// DELETE /api/messages/:messageId
// Delete your own message for everyone in the conversation.
export const deleteMessageForEveryone = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user?._id;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid message ID",
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (message.sender.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own messages for everyone",
      });
    }

    if (message.isDeletedForEveryone) {
      return res.status(400).json({
        success: false,
        message: "Message has already been deleted",
      });
    }

    const chat = await findUserChat(
      message.chat.toString(),
      currentUserId
    );

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Preserve the message record but remove its content.
    message.text = "";
    message.imageUrl = "";
    message.fileUrl = "";
    message.isDeletedForEveryone = true;

    await message.save();

    const deletionData = {
      messageId: message._id.toString(),
      chatId: chat._id.toString(),
      isDeletedForEveryone: true,
      text: "",
    };

    emitToChat(
      req.app.get("io"),
      chat,
      "messageDeleted",
      deletionData
    );

    // Update the sidebar if this was the latest message.
    if (
      chat.latestMessage &&
      chat.latestMessage.toString() === message._id.toString()
    ) {
      const latestMessage = await Message.findOne({
        chat: chat._id,
        isDeletedForEveryone: { $ne: true },
        deletedFor: { $ne: currentUserId },
      })
        .sort({ createdAt: -1, _id: -1 })
        .populate("sender", "name profilePic")
        .lean();

      chat.latestMessage = latestMessage?._id || null;
      await chat.save();

      emitToChat(
        req.app.get("io"),
        chat,
        "chatUpdated",
        {
          chatId: chat._id.toString(),
          latestMessage,
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Message deleted for everyone",
      data: deletionData,
    });
  } catch (error) {
    console.error("Delete message for everyone error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete message",
    });
  }
};

// DELETE /api/messages/:messageId/for-me
// Hide a message only for the current user.
export const deleteMessageForMe = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user?._id;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid message ID",
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    const chat = await findUserChat(
      message.chat.toString(),
      currentUserId
    );

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    await Message.updateOne(
      { _id: message._id },
      {
        $addToSet: {
          deletedFor: currentUserId,
        },
      }
    );

    // If the hidden message was the latest message, update this user's
    // sidebar with the latest message that remains visible to them.
    if (
      chat.latestMessage &&
      chat.latestMessage.toString() === message._id.toString()
    ) {
      const latestMessage = await Message.findOne({
        chat: chat._id,
        isDeletedForEveryone: { $ne: true },
        deletedFor: { $ne: currentUserId },
      })
        .sort({ createdAt: -1, _id: -1 })
        .populate("sender", "name profilePic")
        .lean();

      // This simple chat schema stores latestMessage on the shared chat.
      // Do not overwrite it here, because that would affect other members.
      return res.status(200).json({
        success: true,
        message: "Message hidden for you",
        data: {
          messageId: message._id.toString(),
          chatId: chat._id.toString(),
          latestVisibleMessage: latestMessage,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Message hidden for you",
      data: {
        messageId: message._id.toString(),
        chatId: chat._id.toString(),
      },
    });
  } catch (error) {
    console.error("Delete message for me error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete message",
    });
  }
};
