
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  Settings,
  LogOut,
  UserRound,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

import { logoutUser } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

export default function Sidebar() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await logoutUser();

      // Clear the current user from React authentication state.
      logout();

      toast.success("Logged out successfully.");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to log out."
      );
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <aside className="hidden w-[76px] shrink-0 flex-col items-center justify-between border-r border-[#E2E8F0] bg-white py-6 sm:flex">
      {/* Navigation */}
      <div className="flex flex-col items-center gap-8">
        {/* App Logo */}
        <motion.div
          whileHover={{ rotate: -8, scale: 1.08 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#059669] text-white shadow-lg shadow-emerald-100"
        >
          <MessageCircle size={23} />
        </motion.div>

        {/* Chats */}
        <button
          type="button"
          title="Chats"
          aria-label="Chats"
          onClick={() => navigate("/chats")}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-[#059669] transition hover:bg-emerald-100"
        >
          <MessageCircle size={21} />
        </button>

        {/* Profile */}
        <button
          type="button"
          title="Profile"
          aria-label="Profile"
          onClick={() =>
            toast("Profile settings are coming next.")
          }
          className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <UserRound size={21} />
        </button>

        {/* Settings */}
        <button
          type="button"
          title="Settings"
          aria-label="Settings"
          onClick={() =>
            toast("Settings are coming next.")
          }
          className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <Settings size={21} />
        </button>
      </div>

      {/* Logout */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={handleLogout}
        disabled={loggingOut}
        title="Logout"
        aria-label="Logout"
        className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <LogOut
          size={21}
          className={loggingOut ? "animate-pulse" : ""}
        />
      </motion.button>
    </aside>
  );
}
