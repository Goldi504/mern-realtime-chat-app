
import mongoose from "mongoose";
import imagekit from "../config/imagekit.js";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";

export const uploadChatFile = async (req, res) => {
  try {
    const { chatId } = req.body;
    const userId = req.user._id;

    // 1. Validate chat ID
    if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        success: false,
        message: "A valid chatId is required.",
      });
    }

    // 2. Validate uploaded file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image or file to upload.",
      });
    }

    // 3. Verify chat membership
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId,
    });

    if (!chat) {
      return res.status(403).json({
        success: false,
        message: "Chat not found or you are not a member.",
      });
    }

    // 4. Validate ImageKit environment configuration
    const missingVariables = [
      "IMAGEKIT_PUBLIC_KEY",
      "IMAGEKIT_PRIVATE_KEY",
      "IMAGEKIT_URL_ENDPOINT",
    ].filter((key) => !process.env[key]);

    if (missingVariables.length > 0) {
      console.error("Missing ImageKit environment variables:", missingVariables);

      return res.status(500).json({
        success: false,
        message: "ImageKit configuration is incomplete.",
      });
    }

    const isImage = req.file.mimetype.startsWith("image/");
    const messageType = isImage ? "image" : "file";

    // 5. Upload file to ImageKit
    let uploadedFile;

    try {
      console.log("Starting ImageKit upload:", {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      });

      uploadedFile = await imagekit.upload({
        file: req.file.buffer,
        fileName: `${Date.now()}-${req.file.originalname.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        )}`,
        folder: "/chat-app",
        useUniqueFileName: true,
      });

      if (!uploadedFile?.url) {
        throw new Error("ImageKit upload did not return a file URL.");
      }

      console.log("ImageKit upload successful:", uploadedFile.url);
    } catch (imageKitError) {
      // Log the actual error object and its available properties
      console.error("ImageKit upload failed:", imageKitError);

      console.error(
        "ImageKit error details:",
        Object.getOwnPropertyNames(imageKitError).reduce((details, key) => {
          try {
            details[key] = imageKitError[key];
          } catch {
            details[key] = "[Unable to read property]";
          }

          return details;
        }, {})
      );

      return res.status(502).json({
        success: false,
        message: "ImageKit upload failed. Check the backend terminal logs.",
      });
    }

    // 6. Save uploaded file message in MongoDB
    const message = await Message.create({
      chat: chatId,
      sender: userId,
      text: "",
      messageType,
      imageUrl: isImage ? uploadedFile.url : "",
      fileUrl: isImage ? "" : uploadedFile.url,
      fileName: req.file.originalname,
      fileMimeType: req.file.mimetype,
      fileSize: req.file.size,
      readBy: [userId],
      deliveredTo: [userId],
    });

    // 7. Populate message information
    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name profilePic")
      .populate("chat");

    // 8. Update latest message if the Chat schema supports it
    if (chat.schema.path("latestMessage")) {
      chat.latestMessage = message._id;
      await chat.save();
    }

    // 9. Notify connected chat members
    const io = req.app.get("io");

    if (io) {
      io.to(`chat:${chatId}`).emit("newMessage", populatedMessage);
    }

    // 10. Send response
    return res.status(201).json({
      success: true,
      message: "File uploaded successfully.",
      data: populatedMessage,
    });
  } catch (error) {
    console.error("Upload chat file error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to upload file.",
    });
  }
};