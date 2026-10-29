import express from "express";

import {
  createChat,
  getChats,
  getChatById,
  createGroup,
  getGroupMembers,
  addGroupMembers,
  removeGroupMember,
  updateGroupName,
  leaveGroup,
} from "../controllers/chat.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication.
router.use(protect);

// Private conversations
router.get("/", getChats);
router.post("/", createChat);

// Group creation
router.post("/group", createGroup);

// Group member management
router.get("/:chatId/members", getGroupMembers);
router.post("/:chatId/members", addGroupMembers);
router.delete("/:chatId/members/:userId", removeGroupMember);

// Group settings
router.patch("/:chatId/name", updateGroupName);
router.post("/:chatId/leave", leaveGroup);

// Get one conversation. Keep this after the more specific routes.
router.get("/:chatId", getChatById);

export default router;