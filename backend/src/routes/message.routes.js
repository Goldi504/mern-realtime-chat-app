import express from "express";

import {
  sendMessage,
  getMessages,
} from "../controllers/message.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// All message routes require authentication.
router.use(protect);

// Send a message
router.post("/", sendMessage);

// Get messages for a conversation
router.get("/:chatId", getMessages);

export default router;