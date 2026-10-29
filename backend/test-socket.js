
import "dotenv/config";
import { io as createSocket } from "socket.io-client";

const BASE_URL = "http://localhost:5000";

// Existing conversation between Rahul and Priya
const CHAT_ID = "6ae2f7bdac16291713d87f3c";

const users = [
  {
    name: "Rahul",
    email: process.env.TEST_RAHUL_EMAIL,
    password: process.env.TEST_RAHUL_PASSWORD,
  },
  {
    name: "Priya",
    email: process.env.TEST_PRIYA_EMAIL,
    password: process.env.TEST_PRIYA_PASSWORD,
  },
];

async function login(user) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`${user.name} login failed: ${data.message}`);
  }

  // Node.js 22 supports getSetCookie().
  const cookies = response.headers.getSetCookie();
  const tokenCookie = cookies.find((cookie) =>
    cookie.startsWith("token=")
  );

  if (!tokenCookie) {
    throw new Error(
      `No token cookie returned for ${user.name}. Check the login response.`
    );
  }

  const token = tokenCookie
    .split(";")[0]
    .slice("token=".length);

  console.log(`✅ ${user.name} logged in successfully`);

  return token;
}

function connectSocket(user, token) {
  return new Promise((resolve, reject) => {
    const socket = createSocket(BASE_URL, {
      auth: { token },
      reconnection: false,
      timeout: 10000,
    });

    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error(`${user.name} Socket.IO connection timed out`));
    }, 12000);

    socket.once("connect", () => {
      clearTimeout(timer);
      console.log(`🟢 ${user.name} connected to Socket.IO`);
      resolve(socket);
    });

    socket.once("connect_error", (error) => {
      clearTimeout(timer);
      socket.disconnect();
      reject(
        new Error(`${user.name} socket connection failed: ${error.message}`)
      );
    });
  });
}

function joinChat(socket, userName) {
  return new Promise((resolve, reject) => {
    socket.emit("joinChat", CHAT_ID, (result) => {
      if (!result?.success) {
        reject(
          new Error(`${userName} could not join chat: ${result?.message}`)
        );
        return;
      }

      console.log(`✅ ${userName} joined the conversation`);
      resolve();
    });
  });
}

async function sendMessage(token) {
  const response = await fetch(`${BASE_URL}/api/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `token=${token}`,
    },
    body: JSON.stringify({
      chatId: CHAT_ID,
      text: "Real-time test: Hello Priya!",
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Sending message failed: ${data.message}`);
  }

  console.log("📨 Message saved by the backend");
  return data.data;
}

async function main() {
  let rahulSocket;
  let priyaSocket;

  try {
    if (users.some((user) => !user.email || !user.password)) {
      throw new Error(
        "Set TEST_RAHUL_EMAIL, TEST_RAHUL_PASSWORD, TEST_PRIYA_EMAIL, and TEST_PRIYA_PASSWORD in your .env file."
      );
    }

    // Authenticate both users.
    const rahulToken = await login(users[0]);
    const priyaToken = await login(users[1]);

    // Connect both users to Socket.IO.
    rahulSocket = await connectSocket(users[0], rahulToken);
    priyaSocket = await connectSocket(users[1], priyaToken);

    // Join the same private conversation.
    await joinChat(rahulSocket, "Rahul");
    await joinChat(priyaSocket, "Priya");

    // Register the listener before sending the message.
    const messageReceived = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error("Priya did not receive the message within 8 seconds")
        );
      }, 8000);

      priyaSocket.once("newMessage", (message) => {
        clearTimeout(timer);
        resolve(message);
      });
    });

    // Send a message using the existing HTTP API.
    const savedMessage = await sendMessage(rahulToken);

    // Confirm Priya receives the Socket.IO event.
    const receivedMessage = await messageReceived;

    if (receivedMessage._id !== savedMessage._id) {
      throw new Error(
        "Priya received a different message than the one just sent."
      );
    }

    console.log("\n🎉 REAL-TIME MESSAGE TEST PASSED");
    console.log("Sender:", savedMessage.sender.name);
    console.log("Message:", receivedMessage.text);
    console.log("Message ID:", receivedMessage._id);
    console.log("Priya received Rahul's message without polling!");
  } catch (error) {
    console.error("\n❌ REAL-TIME MESSAGE TEST FAILED");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    rahulSocket?.disconnect();
    priyaSocket?.disconnect();
  }
}

main();
