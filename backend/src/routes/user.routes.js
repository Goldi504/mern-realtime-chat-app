import express from "express";

import {
  searchUsers,
  getUsers,
  getUserById,
  updateProfile,
} from "../controllers/user.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes below require authentication
router.use(protect);

// Search users
router.get("/search", searchUsers);

// Get paginated users
router.get("/", getUsers);

// Update the logged-in user's profile
router.put("/profile", updateProfile);

// Get a public profile by user ID
router.get("/:id", getUserById);

export default router;