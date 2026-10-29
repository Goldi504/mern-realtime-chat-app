
import express from "express";

import {
  sendMessage,
  getMessages,
  markMessagesAsRead,
  getUnreadCounts,
  editMessage,
  deleteMessageForEveryone,
  deleteMessageForMe,
} from "../controllers/message.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { uploadChatFile } from "../controllers/upload.controller.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

// All message routes require authentication.
router.use(protect);

// Upload an image or document
// router.post("/upload", upload.single("file"), uploadChatFile);

// Keep this route before /:chatId to avoid route conflicts.
router.get("/unread-counts", getUnreadCounts);

// Send a message.
router.post("/", sendMessage);

// Edit your own message.
router.put("/:messageId", editMessage);

// Delete a message for everyone.
router.delete("/:messageId", deleteMessageForEveryone);

// Hide a message for the current user only.
router.delete("/:messageId/for-me", deleteMessageForMe);

// Read message history.
router.get("/:chatId", getMessages);

// Mark messages in a conversation as read.
router.patch("/:chatId/read", markMessagesAsRead);

router.post("/upload", upload.single("file"), uploadChatFile);


export default router;
