import express from "express";

import {
  createChat,
  getChats,
  getChatById,
} from "../controllers/chat.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// List conversations for the authenticated user
router.get("/", protect, getChats);

// Create a conversation or return the existing one
router.post("/", protect, createChat);

// Get a specific conversation
router.get("/:chatId", protect, getChatById);

export default router;