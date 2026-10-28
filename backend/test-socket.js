
import "dotenv/config";
import { io } from "socket.io-client";
import jwt from "jsonwebtoken";

const SERVER_URL = process.env.TEST_SOCKET_URL || "http://localhost:5000";
const token = process.env.TEST_JWT_TOKEN;

// 1. Validate environment variables
if (!token) {
  console.error("TEST_JWT_TOKEN is missing from backend/.env");
  console.error("Please log in and provide a fresh JWT token.");
  process.exit(1);
}

// 2. Inspect the JWT without printing the token
const decoded = jwt.decode(token);

if (!decoded || typeof decoded !== "object") {
  console.error("Invalid JWT format.");
  process.exit(1);
}

console.log("JWT format: valid");
console.log("JWT has user ID:", Boolean(decoded.id));

if (!decoded.id) {
  console.error("JWT does not contain the expected 'id' field.");
  process.exit(1);
}

console.log("JWT user ID:", decoded.id);

// 3. Check token expiration
if (decoded.exp) {
  const expirationDate = new Date(decoded.exp * 1000);

  console.log("JWT expiration:", expirationDate.toLocaleString());

  if (decoded.exp * 1000 <= Date.now()) {
    console.error("JWT has expired.");
    console.error("Log in again and update TEST_JWT_TOKEN in backend/.env.");
    process.exit(1);
  }
} else {
  console.warn("JWT has no expiration claim.");
}

// 4. Create the Socket.IO client
const socket = io(SERVER_URL, {
  autoConnect: false,
  auth: {
    token,
  },
  reconnection: false,
  timeout: 10000,
});

// 5. Prevent duplicate error handling
let finished = false;

const finish = (exitCode) => {
  if (finished) return;

  finished = true;
  socket.disconnect();
  process.exitCode = exitCode;
};

// 6. Handle successful connection
socket.on("connect", () => {
  console.log("\nSocket connected successfully!");
  console.log("Socket ID:", socket.id);
  console.log("Authenticated user ID:", decoded.id);

  finish(0);
});

// 7. Handle connection errors
socket.on("connect_error", (error) => {
  console.error("\nSocket connection failed:", error.message);

  if (error.message === "User not found") {
    console.error(
      "The JWT user ID does not match a user in the connected MongoDB database."
    );
    console.error(
      "Check the token's user ID and your backend database connection."
    );
  } else if (
    error.message.toLowerCase().includes("token") ||
    error.message.toLowerCase().includes("authentication")
  ) {
    console.error(
      "Check whether the JWT is valid and JWT_SECRET matches the backend configuration."
    );
  }

  finish(1);
});

// 8. Handle unexpected disconnection
socket.on("disconnect", (reason) => {
  console.log("Socket disconnected:", reason);
});

// 9. Connect to the server
console.log("\nConnecting to:", SERVER_URL);
socket.connect();

// 10. Stop waiting if the connection takes too long
const timeout = setTimeout(() => {
  if (!finished) {
    console.error("\nSocket connection timed out.");
    finish(1);
  }
}, 12000);

timeout.unref();
