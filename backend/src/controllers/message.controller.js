import mongoose from "mongoose";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";

// POST /api/messages
// Send a message to a conversation.
export const sendMessage = async (req, res) => {
    try {
        const { chatId, text } = req.body;
        const senderId = req.user._id;

        // Validate chat ID
        if (!chatId || !mongoose.isValidObjectId(chatId)) {
            return res.status(400).json({
                success: false,
                message: "A valid chatId is required",
            });
        }

        // Validate message text
        if (typeof text !== "string" || !text.trim()) {
            return res.status(400).json({
                success: false,
                message: "Message text cannot be empty",
            });
        }

        if (text.trim().length > 5000) {
            return res.status(400).json({
                success: false,
                message: "Message cannot exceed 5000 characters",
            });
        }

        // Find the conversation and verify membership
        const chat = await Chat.findOne({
            _id: chatId,
            participants: senderId,
        });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found",
            });
        }

        // Create the message
        let message = await Message.create({
            chat: chat._id,
            sender: senderId,
            text: text.trim(),
            messageType: "text",
            readBy: [senderId],
        });

        // Update the latest message reference
        chat.latestMessage = message._id;
        await chat.save();


        // Populate sender details for the response
        message = await Message.findById(message._id)
            .populate("sender", "name profilePic")
            .lean();
        const io = req.app.get("io");
        if (io) {
            io.to(`chat:${chat._id}`).emit("newMessage", message);

            // Notify participants' private rooms so their chat lists
            // can update even when they have not opened this conversation.
            for (const participantId of chat.participants) {
                io.to(`user:${participantId.toString()}`).emit(
                    "chatUpdated",
                    {
                        chatId: chat._id.toString(),
                        latestMessage: message,
                    }
                );
            }
        }

        return res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: message,
        });
    } catch (error) {
        console.error("Send message error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to send message",
        });
    }
};

// GET /api/messages/:chatId
// Retrieve messages from a conversation.
export const getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;

        if (!mongoose.isValidObjectId(chatId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid conversation ID",
            });
        }

        // Verify the current user belongs to the conversation
        const chat = await Chat.findOne({
            _id: chatId,
            participants: req.user._id,
        }).select("_id");

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found",
            });
        }

        // Pagination
        const page = Number.parseInt(req.query.page, 10) || 1;
        const limit = Number.parseInt(req.query.limit, 10) || 30;

        if (
            !Number.isInteger(page) ||
            !Number.isInteger(limit) ||
            page < 1 ||
            limit < 1 ||
            limit > 100
        ) {
            return res.status(400).json({
                success: false,
                message: "Page must be positive and limit must be between 1 and 100",
            });
        }

        // Fetch newest messages first, then return them oldest-first.
        const messages = await Message.find({
            chat: chat._id,
        })
            .populate("sender", "name profilePic")
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const totalMessages = await Message.countDocuments({
            chat: chat._id,
        });

        return res.status(200).json({
            success: true,
            messages: messages.reverse(),
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalMessages / limit),
                totalMessages,
                limit,
            },
        });
    } catch (error) {
        console.error("Get messages error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve messages",
        });
    }
};