import "dotenv/config";
import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:5000";

const tokenA = process.env.TEST_JWT_TOKEN;
const tokenB = process.env.TEST_JWT_TOKEN_B;
const chatId = process.env.TEST_CHAT_ID;

if (!tokenA || !tokenB || !chatId) {
  console.error(
    "Please configure TEST_JWT_TOKEN, TEST_JWT_TOKEN_B, and TEST_CHAT_ID in .env"
  );
  process.exit(1);
}

const userA = io(SERVER_URL, {
  auth: { token: tokenA },
  reconnection: false,
});

const userB = io(SERVER_URL, {
  auth: { token: tokenB },
  reconnection: false,
});

let receivedMessage = false;
let joinedA = false;
let joinedB = false;
let finished = false;

function finish(success, message) {
  if (finished) return;
  finished = true;

  console.log(success ? `PASS: ${message}` : `FAIL: ${message}`);

  userA.disconnect();
  userB.disconnect();

  process.exitCode = success ? 0 : 1;
}

function joinChat(socket, label, callback) {
  socket.emit("joinChat", chatId, (result) => {
    if (!result?.success) {
      console.error(`${label} could not join chat:`, result?.message);
      finish(false, `${label} could not join the chat`);
      return;
    }

    console.log(`${label} joined the chat`);
    callback();
  });
}

userA.on("connect_error", (error) => {
  console.error("User A connection error:", error.message);
  finish(false, "User A failed to connect");
});

userB.on("connect_error", (error) => {
  console.error("User B connection error:", error.message);
  finish(false, "User B failed to connect");
});

userB.on("newMessage", (message) => {
  if (message?.text === "Realtime backend test") {
    receivedMessage = true;
    console.log("User B received the test message:", message.text);
  }
});

userB.on("chatUpdated", (data) => {
  if (data?.chatId === chatId) {
    console.log("User B received chatUpdated");
  }
});

userA.on("connect", () => {
  console.log("User A connected");
  joinChat(userA, "User A", () => {
    joinedA = true;
    sendWhenReady();
  });
});

userB.on("connect", () => {
  console.log("User B connected");
  joinChat(userB, "User B", () => {
    joinedB = true;
    sendWhenReady();
  });
});

function sendWhenReady() {
  if (!joinedA || !joinedB || finished) return;

  // This script will test event delivery after both users join.
  console.log("Both users joined. Ready for the message test.");
  console.log(
    "Next, send the test message through POST /api/messages using User A's authentication."
  );
}

setTimeout(() => {
  if (!finished && !receivedMessage) {
    finish(
      false,
      "No test message received. The REST message request has not been verified."
    );
  }
}, 30000).unref();