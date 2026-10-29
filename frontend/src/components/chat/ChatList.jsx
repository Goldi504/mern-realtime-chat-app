
import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

import { getUsers } from "../../services/userService";

export default function ChatList() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");

    try {
      const response = await getUsers();

      if (!response.success) {
        throw new Error(response.message || "Unable to load users.");
      }

      setUsers(response.users || []);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Unable to load users.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter((user) =>
    `${user.name || ""} ${user.email || ""}`
      .toLowerCase()
      .includes(search.toLowerCase().trim())
  );

  function handleSelectUser(user) {
    setActiveUser(user);

    // The next step will open or create a real conversation.
    toast.success(`Selected ${user.name}`);
  }

  return (
    <section className="flex min-h-0 w-full shrink-0 flex-col border-r border-[#E2E8F0] bg-white md:w-[340px] lg:w-[370px]">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] px-5 py-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#059669]">
              ChatApp
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0F172A]">
              Messages
            </h1>
          </div>

          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            title="Refresh users"
            aria-label="Refresh users"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2E8F0] text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-[#059669] disabled:opacity-50"
          >
            <RefreshCw
              size={18}
              className={loading ? "animate-spin" : ""}
            />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email..."
            aria-label="Search users"
            className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#059669] focus:ring-4 focus:ring-emerald-50"
          />
        </div>
      </div>

      {/* User List */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Registered users
          </p>

          {!loading && (
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-[#059669]">
              {filteredUsers.length}
            </span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-100 border-t-[#059669]" />

            <p className="mt-3 text-sm text-slate-500">
              Loading users...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="mx-2 rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">
              Could not load users
            </p>

            <p className="mt-1 break-words text-xs text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={loadUsers}
              className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
            >
              Try again
            </button>
          </div>
        )}

        {/* Actual Users */}
        {!loading && !error && filteredUsers.length > 0 && (
          <div className="space-y-1">
            {filteredUsers.map((user, index) => {
              const selected = activeUser?._id === user._id;

              return (
                <motion.button
                  key={user._id}
                  type="button"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  onClick={() => handleSelectUser(user)}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                    selected
                      ? "bg-emerald-50 ring-1 ring-emerald-100"
                      : "hover:bg-slate-50"
                  }`}
                >
                  {/* Profile picture or initials */}
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-100 text-sm font-bold text-emerald-700">
                    {user.profilePic ? (
                      <img
                        src={user.profilePic}
                        alt={`${user.name}'s profile`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (user.name || "U")
                        .trim()
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase()
                    )}

                    <span
                      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                        user.isOnline
                          ? "bg-emerald-500"
                          : "bg-slate-300"
                      }`}
                    />
                  </div>

                  {/* User details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="truncate text-sm font-semibold text-[#0F172A]">
                        {user.name || "Unknown user"}
                      </h2>

                      <span
                        className={`shrink-0 text-[10px] ${
                          user.isOnline
                            ? "text-emerald-600"
                            : "text-slate-400"
                        }`}
                      >
                        {user.isOnline ? "Online" : "Offline"}
                      </span>
                    </div>

                    <p className="mt-1 truncate text-xs text-slate-500">
                      {user.email}
                    </p>

                    {user.about && (
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {user.about}
                      </p>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredUsers.length === 0 && (
          <div className="flex flex-col items-center px-5 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#059669]">
              <MessageCircle size={26} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-[#0F172A]">
              {users.length === 0
                ? "No other users yet"
                : "No users found"}
            </h3>

            <p className="mt-2 text-xs leading-5 text-slate-400">
              {users.length === 0
                ? "Register another account to test chatting between users."
                : "Try searching with a different name or email."}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#E2E8F0] px-5 py-3">
        <p className="text-center text-xs text-slate-400">
          {users.length} registered{" "}
          {users.length === 1 ? "user" : "users"} available
        </p>
      </div>
    </section>
  );
}
