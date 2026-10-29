
import "dotenv/config";
import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:5000";

const USER1_TOKEN = process.env.TEST_USER1_TOKEN;
const USER2_TOKEN = process.env.TEST_USER2_TOKEN;
const CHAT_ID = process.env.TEST_CHAT_ID;

const TIMEOUT = 10000;

if (!USER1_TOKEN || !USER2_TOKEN || !CHAT_ID) {
  console.error("\n❌ Missing test configuration.");
  console.error(
    "Set TEST_USER1_TOKEN, TEST_USER2_TOKEN, and TEST_CHAT_ID."
  );
  process.exit(1);
}

if (!/^[a-fA-F0-9]{24}$/.test(CHAT_ID)) {
  console.error("❌ Invalid TEST_CHAT_ID.");
  process.exit(1);
}

if (USER1_TOKEN === USER2_TOKEN) {
  console.error("❌ Rahul and Priya must use different JWT tokens.");
  process.exit(1);
}

const user1 = io(SERVER_URL, {
  auth: { token: USER1_TOKEN },
  transports: ["websocket"],
  reconnection: false,
  timeout: TIMEOUT,
});

const user2 = io(SERVER_URL, {
  auth: { token: USER2_TOKEN },
  transports: ["websocket"],
  reconnection: false,
  timeout: TIMEOUT,
});

let user1Joined = false;
let user2Joined = false;
let typingReceived = false;
let stopTypingReceived = false;
let finished = false;

function cleanup(exitCode) {
  if (finished) return;
  finished = true;

  clearTimeout(testTimeout);

  user1.disconnect();
  user2.disconnect();

  setTimeout(() => {
    process.exit(exitCode);
  }, 300);
}

function fail(message) {
  console.error(`\n❌ FAILED: ${message}`);
  cleanup(1);
}

function joinChat(socket, userLabel) {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject(new Error(`${userLabel} is not connected`));
      return;
    }

    console.log(`\n➡️ ${userLabel} requesting to join chat ${CHAT_ID}`);

    const ackTimeout = setTimeout(() => {
      reject(
        new Error(
          `${userLabel} joinChat timed out. Check the backend terminal for "joinChat received" or "joinChat error".`
        )
      );
    }, TIMEOUT);

    socket.emit("joinChat", { chatId: CHAT_ID }, (response) => {
      clearTimeout(ackTimeout);

      console.log(`📩 ${userLabel} joinChat response:`, response);

      if (!response) {
        reject(new Error(`${userLabel} received an empty acknowledgment`));
        return;
      }

      if (!response.success) {
        reject(
          new Error(
            `${userLabel} could not join chat: ${response.message || "Unknown error"}`
          )
        );
        return;
      }

      console.log(`✅ ${userLabel} joined the chat`);
      resolve();
    });
  });
}

const testTimeout = setTimeout(() => {
  fail("Overall test timed out.");
}, 30000);

user1.on("connect", async () => {
  console.log("✅ User 1 connected:", user1.id);

  try {
    await joinChat(user1, "User 1");
    user1Joined = true;
    startTypingTest();
  } catch (error) {
    fail(error.message);
  }
});

user2.on("connect", async () => {
  console.log("✅ User 2 connected:", user2.id);

  try {
    await joinChat(user2, "User 2");
    user2Joined = true;
    startTypingTest();
  } catch (error) {
    fail(error.message);
  }
});

user1.on("connect_error", (error) => {
  fail(`User 1 connection error: ${error.message}`);
});

user2.on("connect_error", (error) => {
  fail(`User 2 connection error: ${error.message}`);
});

user2.on("userTyping", (data) => {
  console.log("\n📩 userTyping event received:", data);

  if (data?.chatId !== CHAT_ID) {
    console.error("⚠️ Typing event contained an unexpected chat ID.");
    return;
  }

  typingReceived = true;
  console.log("✅ Typing indicator test passed");

  user1.emit("stopTyping", { chatId: CHAT_ID });
});

user2.on("userStoppedTyping", (data) => {
  console.log("\n📩 userStoppedTyping event received:", data);

  if (data?.chatId !== CHAT_ID) {
    console.error("⚠️ Stop-typing event contained an unexpected chat ID.");
    return;
  }

  stopTypingReceived = true;
  console.log("✅ Stop-typing indicator test passed");

  console.log("\n========== TEST SUMMARY ==========");
  console.log(`User 1 joined: ${user1Joined ? "PASS" : "FAIL"}`);
  console.log(`User 2 joined: ${user2Joined ? "PASS" : "FAIL"}`);
  console.log(`Typing event: ${typingReceived ? "PASS" : "FAIL"}`);
  console.log(`Stop typing event: ${stopTypingReceived ? "PASS" : "FAIL"}`);

  cleanup(
    user1Joined &&
      user2Joined &&
      typingReceived &&
      stopTypingReceived
      ? 0
      : 1
  );
});

function startTypingTest() {
  if (finished || !user1Joined || !user2Joined) return;

  // Prevent the same test from starting more than once.
  user1Joined = true;
  user2Joined = true;

  console.log("\n➡️ Both users joined. Testing typing indicator...");
  user1.emit("typing", { chatId: CHAT_ID });
}

user1.on("disconnect", (reason) => {
  console.log("User 1 disconnected:", reason);
});

user2.on("disconnect", (reason) => {
  console.log("User 2 disconnected:", reason);
});

console.log("🚀 Starting typing indicator test...");
console.log("Server:", SERVER_URL);
console.log("Chat ID:", CHAT_ID);
console.log("Connecting both users...");
