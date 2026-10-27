import express from "express";

import {
  createChat,
  getChats,
  getChatById,
} from "../controllers/chat.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// All chat endpoints require authentication.
router.use(protect);

// Create or retrieve a direct conversation.
router.post("/", createChat);

// Retrieve all conversations for the current user.
router.get("/", getChats);

// Retrieve a specific conversation.
router.get("/:chatId", getChatById);

export default router;