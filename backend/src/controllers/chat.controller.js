import mongoose from "mongoose";

import Chat from "../models/Chat.js";
import User from "../models/User.js";

// POST /api/chats
// Create a private conversation or return the existing one.
export const createChat = async (req, res) => {
  try {
    // Protect against missing or incorrectly parsed request bodies.
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({
        success: false,
        message: "Request body must contain valid JSON",
      });
    }

    const { userId } = req.body;
    const currentUserId = req.user?._id;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: "A valid userId is required",
      });
    }

    if (currentUserId.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot create a conversation with yourself",
      });
    }

    const otherUser = await User.findById(userId).select("_id");

    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Find an existing one-to-one conversation.
    let chat = await Chat.findOne({
      isGroupChat: false,
      participants: {
        $all: [currentUserId, otherUser._id],
        $size: 2,
      },
    });

    if (chat) {
      chat = await Chat.findById(chat._id).populate(
        "participants",
        "name email profilePic about isOnline lastSeen"
      );

      return res.status(200).json({
        success: true,
        message: "Conversation already exists",
        chat,
      });
    }

    // Create a new private conversation.
    chat = await Chat.create({
      participants: [currentUserId, otherUser._id],
      isGroupChat: false,
    });

    chat = await Chat.findById(chat._id).populate(
      "participants",
      "name email profilePic about isOnline lastSeen"
    );

    return res.status(201).json({
      success: true,
      message: "Conversation created successfully",
      chat,
    });
  } catch (error) {
    console.error("Create chat error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create conversation",
    });
  }
};

// GET /api/chats
// Return the authenticated user's conversations.
export const getChats = async (req, res) => {
  try {
    const currentUserId = req.user?._id;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const chats = await Chat.find({
      participants: currentUserId,
    })
      .populate(
        "participants",
        "name email profilePic about isOnline lastSeen"
      )
      .populate({
        path: "latestMessage",
        select: "text sender createdAt",
        populate: {
          path: "sender",
          select: "name profilePic",
        },
      })
      .sort({ updatedAt: -1 })
      .lean();

    // For private conversations, show the other participant.
    const formattedChats = chats.map((chat) => ({
      ...chat,
      participants: (chat.participants || []).filter(
        (participant) =>
          participant &&
          participant._id.toString() !== currentUserId.toString()
      ),
    }));

    return res.status(200).json({
      success: true,
      count: formattedChats.length,
      chats: formattedChats,
    });
  } catch (error) {
    console.error("Get chats error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve conversations",
    });
  }
};

// GET /api/chats/:chatId
// Return a conversation only if the authenticated user belongs to it.
export const getChatById = async (req, res) => {
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
    }).populate(
      "participants",
      "name email profilePic about isOnline lastSeen"
    );

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    return res.status(200).json({
      success: true,
      chat,
    });
  } catch (error) {
    console.error("Get chat error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve conversation",
    });
  }
};