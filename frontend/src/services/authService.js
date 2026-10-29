import api from "./api";

// Register a new user
export const registerUser = async (userData) => {
  const response = await api.post("/auth/register", userData);
  return response.data;
};

// Login an existing user
export const loginUser = async (credentials) => {
  const response = await api.post("/auth/login", credentials);
  return response.data;
};

// Get the currently logged-in user
export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

// Logout the current user
export const logoutUser = async () => {
  const response = await api.post("/auth/logout");
  return response.data;
};