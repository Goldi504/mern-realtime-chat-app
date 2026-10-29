import mongoose from "mongoose";
import User from "../models/User.js";

// GET /api/users/search?q=rahul
export const searchUsers = async (req, res) => {
  try {
    const query = req.query.q?.trim();

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must contain at least 2 characters",
      });
    }

    if (query.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Search query cannot exceed 50 characters",
      });
    }

    // Escape special regex characters supplied by the user
const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { name: { $regex: escapedQuery, $options: "i" } },
        { email: { $regex: escapedQuery, $options: "i" } },
      ],
    })
      .select("_id name email profilePic about isOnline lastSeen")
      .limit(20)
      .lean();

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Search users error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to search users",
    });
  }
};

// GET /api/users?page=1&limit=20
export const getUsers = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || 20;

    if (
      !Number.isInteger(page) ||
      !Number.isInteger(limit) ||
      page < 1 ||
      limit < 1 ||
      limit > 50
    ) {
      return res.status(400).json({
        success: false,
        message: "Page must be positive and limit must be between 1 and 50",
      });
    }

    const filter = {
      _id: { $ne: req.user._id },
    };

    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select("_id name email profilePic about isOnline lastSeen")
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        limit,
      },
    });
  } catch (error) {
    console.error("Get users error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve users",
    });
  }
};

// GET /api/users/:id
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(id)
      .select("_id name profilePic about isOnline lastSeen")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user profile",
    });
  }
};

// PUT /api/users/profile
export const updateProfile = async (req, res) => {
  try {
    const { name, about, profilePic } = req.body;

    // Only allow explicitly supported profile fields
    const updates = {};

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        name.trim().length < 2 ||
        name.trim().length > 50
      ) {
        return res.status(400).json({
          success: false,
          message: "Name must contain between 2 and 50 characters",
        });
      }

      updates.name = name.trim();
    }

    if (about !== undefined) {
      if (
        typeof about !== "string" ||
        about.length > 150
      ) {
        return res.status(400).json({
          success: false,
          message: "About must be a string of at most 150 characters",
        });
      }

      updates.about = about.trim();
    }

    if (profilePic !== undefined) {
      if (
        typeof profilePic !== "string" ||
        profilePic.length > 2048
      ) {
        return res.status(400).json({
          success: false,
          message: "Profile picture URL is invalid",
        });
      }

      if (
        profilePic &&
        !/^https:\/\//i.test(profilePic)
      ) {
        return res.status(400).json({
          success: false,
          message: "Profile picture must use HTTPS",
        });
      }

      updates.profilePic = profilePic;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one profile field to update",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    ).select("_id name email profilePic about isOnline lastSeen");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};