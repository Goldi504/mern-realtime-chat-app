
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Login from "../../pages/Login";
import Register from "../../pages/Register";
import Chats from "../../pages/Chats";

export default function App() {
  return (
    <>
      <Toaster position="top-right" />

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chats" element={<Chats />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}
