import "dotenv/config";
import { io } from "socket.io-client";
import jwt from "jsonwebtoken";

const SERVER_URL = "http://localhost:5000";
const token = process.env.TEST_JWT_TOKEN;

if (!token) {
  console.error("TEST_JWT_TOKEN is missing from backend/.env");
  process.exit(1);
}

// Check the token's structure locally without printing the token.
try {
  const decoded = jwt.decode(token);

  if (!decoded) {
    console.error("The supplied token is not a valid JWT format.");
    process.exit(1);
  }

  console.log("JWT format: valid");
  console.log("JWT has user ID:", Boolean(decoded.id));
  console.log("JWT expiration:", decoded.exp
    ? new Date(decoded.exp * 1000).toLocaleString()
    : "No expiration claim");
} catch (error) {
  console.error("Could not inspect JWT:", error.message);
  process.exit(1);
}

const socket = io(SERVER_URL, {
  autoConnect: false,
  auth: { token },
  reconnection: false,
});

socket.on("connect", () => {
  console.log("Socket connected successfully!");
  console.log("Socket ID:", socket.id);
  socket.disconnect();
});

socket.on("connect_error", (error) => {
  console.error("Socket connection failed:", error.message);
  process.exitCode = 1;
  socket.disconnect();
});

socket.connect();

setTimeout(() => {
  if (!socket.connected) {
    console.error("Connection timed out.");
    socket.disconnect();
    process.exitCode = 1;
  }
}, 10000).unref();
