import mongoose from "mongoose";

import Chat from "../models/Chat.js";
import User from "../models/User.js";

const USER_FIELDS = "name email profilePic about isOnline lastSeen";

const getCurrentUserId = (req) => req.user?._id?.toString();

const isGroupAdmin = (chat, userId) =>
  chat.groupAdmin?.toString() === userId;

// POST /api/chats
// Create a private conversation or return the existing one.
export const createChat = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { userId } = req.body || {};

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

    if (currentUserId === userId.toString()) {
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

    let chat = await Chat.findOne({
      isGroupChat: false,
      participants: {
        $all: [currentUserId, otherUser._id],
        $size: 2,
      },
    });

    if (chat) {
      await chat.populate("participants", USER_FIELDS);

      return res.status(200).json({
        success: true,
        message: "Conversation already exists",
        chat,
      });
    }

    chat = await Chat.create({
      participants: [currentUserId, otherUser._id],
      isGroupChat: false,
    });

    await chat.populate("participants", USER_FIELDS);

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
// Return private conversations and groups for the authenticated user.
export const getChats = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const chats = await Chat.find({
      participants: currentUserId,
    })
      .populate("participants", USER_FIELDS)
      .populate({
        path: "latestMessage",
        select: "text sender createdAt messageType imageUrl fileUrl",
        populate: {
          path: "sender",
          select: "name profilePic",
        },
      })
      .populate("groupAdmin", "name email profilePic")
      .sort({ updatedAt: -1 })
      .lean();

    const formattedChats = chats.map((chat) => {
      // Keep all participants for groups.
      if (chat.isGroupChat) {
        return chat;
      }

      // For private chats, return only the other participant.
      return {
        ...chat,
        participants: (chat.participants || []).filter(
          (participant) =>
            participant &&
            participant._id.toString() !== currentUserId
        ),
      };
    });

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
// Return a conversation only if the user belongs to it.
export const getChatById = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { chatId } = req.params;

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
    })
      .populate("participants", USER_FIELDS)
      .populate("groupAdmin", "name email profilePic");

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

// POST /api/chats/group
// Create a group. The creator becomes its first admin.
export const createGroup = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { groupName, memberIds } = req.body || {};

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (
      typeof groupName !== "string" ||
      !groupName.trim() ||
      groupName.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Group name is required and must be at most 100 characters",
      });
    }

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Add at least one other member to create a group",
      });
    }

    const invalidId = memberIds.some(
      (id) => !mongoose.isValidObjectId(id)
    );

    if (invalidId) {
      return res.status(400).json({
        success: false,
        message: "One or more member IDs are invalid",
      });
    }

    const uniqueMemberIds = [
      ...new Set([
        currentUserId,
        ...memberIds.map((id) => id.toString()),
      ]),
    ];

    const users = await User.find({
      _id: { $in: uniqueMemberIds },
    }).select("_id");

    if (users.length !== uniqueMemberIds.length) {
      return res.status(404).json({
        success: false,
        message: "One or more users were not found",
      });
    }

    const chat = await Chat.create({
      participants: uniqueMemberIds,
      isGroupChat: true,
      groupName: groupName.trim(),
      groupAdmin: currentUserId,
    });

    const populatedChat = await Chat.findById(chat._id)
      .populate("participants", USER_FIELDS)
      .populate("groupAdmin", "name email profilePic");

    const io = req.app.get("io");

    if (io) {
      uniqueMemberIds.forEach((userId) => {
        io.to(`user:${userId}`).emit("groupCreated", {
          chat: populatedChat,
        });
      });
    }

    return res.status(201).json({
      success: true,
      message: "Group created successfully",
      chat: populatedChat,
    });
  } catch (error) {
    console.error("Create group error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create group",
    });
  }
};

// GET /api/chats/:chatId/members
// Get group members. Only current members can view them.
export const getGroupMembers = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { chatId } = req.params;

    if (!mongoose.isValidObjectId(chatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
    }

    const chat = await Chat.findOne({
      _id: chatId,
      participants: currentUserId,
      isGroupChat: true,
    })
      .populate("participants", USER_FIELDS)
      .populate("groupAdmin", "name email profilePic");

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Group not found or you are not a member",
      });
    }

    return res.status(200).json({
      success: true,
      count: chat.participants.length,
      groupName: chat.groupName,
      groupAdmin: chat.groupAdmin,
      members: chat.participants,
    });
  } catch (error) {
    console.error("Get group members error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve group members",
    });
  }
};

// POST /api/chats/:chatId/members
// Only the group admin can add members.
export const addGroupMembers = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { chatId } = req.params;
    const { memberIds } = req.body || {};

    if (!mongoose.isValidObjectId(chatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID",
      });
    }

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one member ID",
      });
    }

    if (memberIds.some((id) => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({
        success: false,
        message: "One or more member IDs are invalid",
      });
    }

    const chat = await Chat.findOne({
      _id: chatId,
      isGroupChat: true,
      participants: currentUserId,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Group not found or you are not a member",
      });
    }

    if (!isGroupAdmin(chat, currentUserId)) {
      return res.status(403).json({
        success: false,
        message: "Only the group admin can add members",
      });
    }

    const uniqueIds = [
      ...new Set(memberIds.map((id) => id.toString())),
    ];

    const existingIds = new Set(
      chat.participants.map((id) => id.toString())
    );

    const newIds = uniqueIds.filter((id) => !existingIds.has(id));

    if (newIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "All provided users are already group members",
      });
    }

    const users = await User.find({
      _id: { $in: newIds },
    }).select("_id");

    if (users.length !== newIds.length) {
      return res.status(404).json({
        success: false,
        message: "One or more users were not found",
      });
    }

    chat.participants.push(...newIds);
    await chat.save();

    const populatedChat = await Chat.findById(chat._id)
      .populate("participants", USER_FIELDS)
      .populate("groupAdmin", "name email profilePic");

    const io = req.app.get("io");

    if (io) {
      newIds.forEach((userId) => {
        io.to(`user:${userId}`).emit("groupAdded", {
          chat: populatedChat,
        });
      });

      io.to(`chat:${chatId}`).emit("groupMembersUpdated", {
        chatId,
        participants: populatedChat.participants,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Members added successfully",
      chat: populatedChat,
    });
  } catch (error) {
    console.error("Add group members error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add group members",
    });
  }
};

// DELETE /api/chats/:chatId/members/:userId
// Only the admin can remove members other than the admin.
export const removeGroupMember = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { chatId, userId } = req.params;

    if (
      !mongoose.isValidObjectId(chatId) ||
      !mongoose.isValidObjectId(userId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID or member ID",
      });
    }

    const chat = await Chat.findOne({
      _id: chatId,
      isGroupChat: true,
      participants: currentUserId,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Group not found or you are not a member",
      });
    }

    if (!isGroupAdmin(chat, currentUserId)) {
      return res.status(403).json({
        success: false,
        message: "Only the group admin can remove members",
      });
    }

    if (currentUserId === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Use the leave-group endpoint to leave the group",
      });
    }

    if (!chat.participants.some((id) => id.toString() === userId)) {
      return res.status(404).json({
        success: false,
        message: "This user is not a member of the group",
      });
    }

    // Keep the group admin role explicit; transfer it before removing an admin.
    if (chat.groupAdmin?.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Transfer admin rights before removing the group admin",
      });
    }

    // Do not save a group with only one participant.
    if (chat.participants.length <= 2) {
      return res.status(400).json({
        success: false,
        message: "A group must have at least two members. Ask the member to leave instead.",
      });
    }

    chat.participants = chat.participants.filter(
      (id) => id.toString() !== userId.toString()
    );

    await chat.save();

    const populatedChat = await Chat.findById(chat._id)
      .populate("participants", USER_FIELDS)
      .populate("groupAdmin", "name email profilePic");

    const io = req.app.get("io");

    if (io) {
      // Remove the user's socket connections from the group's room.
      const removedSockets = io.sockets.sockets;

      for (const socket of removedSockets.values()) {
        if (socket.user?._id?.toString() === userId.toString()) {
          socket.leave(`chat:${chatId}`);
        }
      }

      io.to(`user:${userId}`).emit("groupRemoved", { chatId });

      io.to(`chat:${chatId}`).emit("groupMembersUpdated", {
        chatId,
        participants: populatedChat.participants,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Member removed successfully",
      chat: populatedChat,
    });
  } catch (error) {
    console.error("Remove group member error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove group member",
    });
  }
};

// PATCH /api/chats/:chatId/name
// Only the group admin can rename the group.
export const updateGroupName = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { chatId } = req.params;
    const { groupName } = req.body || {};

    if (!mongoose.isValidObjectId(chatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID",
      });
    }

    if (
      typeof groupName !== "string" ||
      !groupName.trim() ||
      groupName.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Group name is required and must be at most 100 characters",
      });
    }

    const chat = await Chat.findOne({
      _id: chatId,
      isGroupChat: true,
      participants: currentUserId,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Group not found or you are not a member",
      });
    }

    if (!isGroupAdmin(chat, currentUserId)) {
      return res.status(403).json({
        success: false,
        message: "Only the group admin can change the group name",
      });
    }

    chat.groupName = groupName.trim();
    await chat.save();

    const populatedChat = await Chat.findById(chat._id)
      .populate("participants", USER_FIELDS)
      .populate("groupAdmin", "name email profilePic");

    const io = req.app.get("io");

    if (io) {
      io.to(`chat:${chatId}`).emit("groupUpdated", {
        chat: populatedChat,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Group name updated successfully",
      chat: populatedChat,
    });
  } catch (error) {
    console.error("Update group name error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update group name",
    });
  }
};

// POST /api/chats/:chatId/leave
// A leaving admin transfers admin rights to another remaining member.
export const leaveGroup = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { chatId } = req.params;

    if (!mongoose.isValidObjectId(chatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID",
      });
    }

    const chat = await Chat.findOne({
      _id: chatId,
      isGroupChat: true,
      participants: currentUserId,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Group not found or you are not a member",
      });
    }

    chat.participants = chat.participants.filter(
      (id) => id.toString() !== currentUserId
    );

    // If fewer than two members remain, the group can no longer exist
    // under the current Chat schema's validation rule.
    if (chat.participants.length < 2) {
      await Chat.deleteOne({ _id: chat._id });

      const io = req.app.get("io");

      if (io) {
        io.to(`chat:${chatId}`).emit("groupDeleted", { chatId });
        io.to(`user:${currentUserId}`).emit("groupRemoved", { chatId });
      }

      return res.status(200).json({
        success: true,
        message: "You left the group. The group was deleted because fewer than two members remained.",
      });
    }

    if (isGroupAdmin(chat, currentUserId)) {
      chat.groupAdmin = chat.participants[0];
    }

    await chat.save();

    const populatedChat = await Chat.findById(chat._id)
      .populate("participants", USER_FIELDS)
      .populate("groupAdmin", "name email profilePic");

    const io = req.app.get("io");

    if (io) {
      for (const socket of io.sockets.sockets.values()) {
        if (socket.user?._id?.toString() === currentUserId) {
          socket.leave(`chat:${chatId}`);
        }
      }

      io.to(`user:${currentUserId}`).emit("groupRemoved", { chatId });

      io.to(`chat:${chatId}`).emit("groupMembersUpdated", {
        chatId,
        participants: populatedChat.participants,
        groupAdmin: populatedChat.groupAdmin,
      });
    }

    return res.status(200).json({
      success: true,
      message: "You left the group successfully",
      chat: populatedChat,
    });
  } catch (error) {
    console.error("Leave group error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to leave group",
    });
  }
};