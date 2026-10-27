import mongoose from "mongoose";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import Message from "../models/Message.js";

// POST /api/chats
// Create a new direct conversation or return an existing one.
export const createChat = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id;

    // Validate the requested user ID.
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: "A valid userId is required",
      });
    }

    // Prevent a user from chatting with themselves.
    if (currentUserId.equals(userId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot create a conversation with yourself",
      });
    }

    // Verify that the other user exists.
    const otherUser = await User.findById(userId).select("_id");

    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Find an existing direct conversation.
    let chat = await Chat.findOne({
      isGroupChat: false,
      participants: {
        $all: [currentUserId, otherUser._id],
        $size: 2,
      },
    }).populate(
      "participants",
      "name email profilePic about isOnline lastSeen"
    );

    // Return the existing conversation if one exists.
    if (chat) {
      return res.status(200).json({
        success: true,
        message: "Conversation already exists",
        chat,
      });
    }

    // Otherwise, create a new conversation.
    chat = await Chat.create({
      participants: [currentUserId, otherUser._id],
      isGroupChat: false,
    });

    // Populate participant details for the response.
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
// Retrieve all conversations belonging to the logged-in user.
export const getChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id,
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

    // Hide the logged-in user's own profile from the contact list.
    const formattedChats = chats.map((chat) => ({
      ...chat,
      participants: chat.participants.filter(
        (participant) =>
          participant._id.toString() !== req.user._id.toString()
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
// Retrieve one conversation, but only for a participant.
export const getChatById = async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!mongoose.isValidObjectId(chatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
    }

    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.user._id,
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