import User from "../models/User.js";

export const getUsers = async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user._id },
    })
      .select("_id name email profilePic about isOnline")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get users error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch users.",
    });
  }
};