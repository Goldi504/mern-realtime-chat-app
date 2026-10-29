
import express from "express";

import {
  sendMessage,
  getMessages,
  markMessagesAsRead,
  getUnreadCounts,
} from "../controllers/message.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

// Keep this route before /:chatId to avoid route conflicts.
router.get("/unread-counts", getUnreadCounts);

router.post("/", sendMessage);

router.get("/:chatId", getMessages);

router.patch("/:chatId/read", markMessagesAsRead);

export default router;
