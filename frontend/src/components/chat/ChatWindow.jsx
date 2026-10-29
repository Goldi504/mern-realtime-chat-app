
import { useEffect, useRef } from "react";
import {
  Phone,
  Video,
  MoreVertical,
  Search,
  MessageCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import MessageInput from "./MessageInput";

export default function ChatWindow({
  selectedUser,
  messages = [],
  onSendMessage,
  loading = false,
}) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  if (!selectedUser) {
    return (
      <section className="hidden min-w-0 flex-1 flex-col items-center justify-center bg-[#F8FAFC] md:flex">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex max-w-md flex-col items-center px-6 text-center"
        >
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-emerald-100 text-emerald-600">
            <MessageCircle size={42} strokeWidth={1.5} />
          </div>

          <h2 className="text-2xl font-bold text-[#0F172A]">
            Your conversations, all in one place
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Select a user from your chat list to start a conversation.
            Your messages will appear here.
          </p>

          <div className="mt-6 rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-medium text-emerald-700 shadow-sm">
            Simple. Private. Connected.
          </div>
        </motion.div>
      </section>
    );
  }

  const userName = selectedUser.name || selectedUser.email || "User";
  const profilePic = selectedUser.profilePic;
  const isOnline = selectedUser.isOnline;

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-[#F8FAFC]">
      {/* Chat header */}
      <header className="flex h-[82px] shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white px-3 sm:px-5 lg:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-100 text-sm font-bold text-emerald-700">
            {profilePic ? (
              <img
                src={profilePic}
                alt={userName}
                className="h-full w-full object-cover"
              />
            ) : (
              userName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
            )}

            <span
              className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                isOnline ? "bg-emerald-500" : "bg-slate-300"
              }`}
            />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-[#0F172A]">
              {userName}
            </h2>

            <p
              className={`mt-1 text-xs ${
                isOnline ? "text-emerald-600" : "text-slate-400"
              }`}
            >
              {isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          {[Search, Phone, Video, MoreVertical].map((Icon, index) => (
            <button
              key={index}
              type="button"
              title={[
                "Search messages",
                "Voice call",
                "Video call",
                "More options",
              ][index]}
              onClick={() => {
                if (index !== 0) {
                  alert("This feature will be added later.");
                }
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-emerald-50 hover:text-[#059669] sm:h-10 sm:w-10"
            >
              <Icon size={18} />
            </button>
          ))}
        </div>
      </header>

      {/* Message area */}
      <div className="relative flex-1 overflow-y-auto px-3 py-5 sm:px-6 sm:py-6 lg:px-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
          <div className="absolute left-1/4 top-1/4 h-40 w-40 rounded-full bg-emerald-100 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-40 w-40 rounded-full bg-sky-100 blur-3xl" />
        </div>

        <div className="relative mx-auto flex max-w-3xl flex-col gap-4">
          {loading ? (
            <div className="flex flex-1 items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-100 border-t-emerald-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                <MessageCircle size={28} />
              </div>

              <h3 className="mt-4 text-base font-semibold text-[#0F172A]">
                Start a conversation
              </h3>

              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                Send your first message to {userName}.
              </p>
            </div>
          ) : (
            messages.map((message, index) => {
              const messageId = message._id || message.id || index;
              const text = message.text ?? message.content ?? "";
              const timestamp = message.createdAt || message.time;

              const formattedTime = timestamp
                ? new Date(timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              return (
                <motion.div
                  key={messageId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${
                    message.own ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] ${
                      message.own
                        ? "rounded-br-md bg-[#DCFCE7] text-[#0F172A]"
                        : "rounded-bl-md border border-[#E2E8F0] bg-white text-[#0F172A]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm leading-6">
                      {text}
                    </p>

                    <div
                      className={`mt-1 text-right text-[10px] ${
                        message.own
                          ? "text-emerald-700"
                          : "text-slate-400"
                      }`}
                    >
                      {formattedTime}
                      {message.own && (
                        <span className="ml-1">✓</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message composer */}
      <div className="shrink-0 border-t border-[#E2E8F0] bg-white px-3 py-4 sm:px-4 lg:px-7">
        <div className="mx-auto max-w-3xl">
          <MessageInput
            onSendMessage={onSendMessage || (() => {})}
            disabled={loading}
          />

          <p className="mt-2 hidden text-center text-[10px] text-slate-400 sm:block">
            Keep your conversations respectful and secure.
          </p>
        </div>
      </div>
    </section>
  );
}
