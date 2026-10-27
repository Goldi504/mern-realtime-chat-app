import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    isGroupChat: {
      type: Boolean,
      default: false,
    },

    groupName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    latestMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Every direct conversation must have exactly two participants.
chatSchema.path("participants").validate(function (participants) {
  if (this.isGroupChat) {
    return participants.length >= 2;
  }

  return (
    participants.length === 2 &&
    String(participants[0]) !== String(participants[1])
  );
}, "Invalid conversation participants");

chatSchema.index({ participants: 1, updatedAt: -1 });

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;