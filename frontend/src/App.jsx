import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Users,
  Search,
  Settings,
  UserRound,
  Phone,
  Video,
  Paperclip,
  Smile,
  Send,
  MoreVertical,
  ArrowLeft,
  Plus,
  CheckCheck,
  Image as ImageIcon,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const initialChats = [
  {
    id: 1,
    name: "Priya Sharma",
    message: "Hey! How are you?",
    time: "10:24 AM",
    unread: 2,
    online: true,
    color: "bg-rose-100",
    initials: "PS",
    messages: [
      { id: 1, text: "Hey! How are you?", mine: false, time: "10:22 AM" },
      {
        id: 2,
        text: "I'm good! How about you?",
        mine: true,
        time: "10:23 AM",
      },
      {
        id: 3,
        text: "I'm good too. Are you coming to college tomorrow?",
        mine: false,
        time: "10:24 AM",
      },
    ],
  },
  {
    id: 2,
    name: "College Friends",
    message: "Let's submit the project tomorrow.",
    time: "9:18 AM",
    unread: 3,
    online: false,
    color: "bg-amber-100",
    initials: "CF",
    group: true,
    messages: [
      {
        id: 1,
        text: "Hey everyone! 👋",
        mine: false,
        time: "9:15 AM",
      },
      {
        id: 2,
        text: "Let's submit the project tomorrow.",
        mine: false,
        time: "9:18 AM",
      },
    ],
  },
  {
    id: 3,
    name: "Family",
    message: "Mom: Take care ❤️",
    time: "8:45 AM",
    unread: 0,
    online: false,
    color: "bg-orange-100",
    initials: "FA",
    messages: [
      {
        id: 1,
        text: "Mom: Take care ❤️",
        mine: false,
        time: "8:45 AM",
      },
    ],
  },
  {
    id: 4,
    name: "Sneha",
    message: "Typing...",
    time: "8:30 AM",
    unread: 0,
    online: true,
    color: "bg-purple-100",
    initials: "SN",
    messages: [
      {
        id: 1,
        text: "See you tomorrow!",
        mine: false,
        time: "8:30 AM",
      },
    ],
  },
  {
    id: 5,
    name: "Project Team",
    message: "You: Shared a document",
    time: "Yesterday",
    unread: 0,
    online: false,
    color: "bg-sky-100",
    initials: "PT",
    group: true,
    messages: [
      {
        id: 1,
        text: "Please check the project document.",
        mine: false,
        time: "Yesterday",
      },
    ],
  },
];

const navigation = [
  { label: "Chats", icon: MessageCircle },
  { label: "Groups", icon: Users },
  { label: "Contacts", icon: UserRound },
  { label: "Settings", icon: Settings },
];

function Avatar({ chat, size = "h-11 w-11" }) {
  return (
    <div
      className={`${size} ${chat.color} flex shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-slate-700`}
    >
      {chat.initials}
    </div>
  );
}

function Sidebar({ activeNav, setActiveNav, onClose }) {
  return (
    <aside className="flex h-full w-full flex-col border-r border-[#E2E8F0] bg-white">
      <div className="flex h-[76px] items-center justify-between border-b border-[#E2E8F0] px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#059669] text-white shadow-lg shadow-emerald-100">
            <MessageCircle size={23} />
          </div>

          <div>
            <h1 className="text-lg font-bold tracking-tight text-[#0F172A]">
              ChatApp
            </h1>
            <p className="text-xs text-slate-500">Stay connected</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="p-4">
        <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Workspace
        </p>

        <div className="space-y-1">
          {navigation.map(({ label, icon: Icon }) => {
            const active = activeNav === label;

            return (
              <motion.button
                key={label}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setActiveNav(label);
                  onClose?.();
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#DCFCE7] text-[#047857]"
                    : "text-slate-500 hover:bg-slate-50 hover:text-[#0F172A]"
                }`}
              >
                <Icon size={19} />
                <span>{label}</span>

                {label === "Chats" && (
                  <span className="ml-auto rounded-full bg-[#059669] px-2 py-0.5 text-xs text-white">
                    5
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="mt-auto border-t border-[#E2E8F0] p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-[#F8FAFC] p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DCFCE7] font-bold text-[#047857]">
            G
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#0F172A]">
              Your Profile
            </p>
            <p className="text-xs text-slate-500">Available</p>
          </div>

          <button
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-[#059669]"
            aria-label="Profile options"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function ChatList({
  chats,
  selectedChat,
  setSelectedChat,
  search,
  setSearch,
  activeNav,
  onNewChat,
}) {
  const filteredChats = useMemo(() => {
    return chats.filter((chat) => {
      const matchesSearch = `${chat.name} ${chat.message}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesTab =
        activeNav === "Groups" ? chat.group : true;

      return matchesSearch && matchesTab;
    });
  }, [chats, search, activeNav]);

  return (
    <section className="flex h-full min-h-0 flex-col border-r border-[#E2E8F0] bg-white">
      <div className="flex items-center justify-between px-5 pb-4 pt-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            {activeNav === "Groups" ? "Groups" : "Messages"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Your conversations, all in one place.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.07, rotate: 5 }}
          whileTap={{ scale: 0.94 }}
          onClick={onNewChat}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#059669] text-white shadow-lg shadow-emerald-100 transition hover:bg-[#047857]"
          aria-label="Start a new chat"
        >
          <Plus size={21} />
        </motion.button>
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 transition focus-within:border-[#059669] focus-within:ring-2 focus-within:ring-emerald-100">
          <Search size={18} className="shrink-0 text-slate-400" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search conversations..."
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            aria-label="Search conversations"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {filteredChats.map((chat) => {
          const active = selectedChat?.id === chat.id;

          return (
            <motion.button
              layout
              key={chat.id}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setSelectedChat(chat)}
              className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors ${
                active
                  ? "border border-emerald-100 bg-[#DCFCE7]/70"
                  : "border border-transparent hover:bg-[#F8FAFC]"
              }`}
            >
              <div className="relative">
                <Avatar chat={chat} />

                {chat.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-[#0F172A]">
                    {chat.name}
                  </p>

                  <span className="shrink-0 text-[10px] text-slate-400">
                    {chat.time}
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-slate-500">
                    {chat.message}
                  </p>

                  {chat.unread > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#059669] px-1.5 text-[10px] font-bold text-white">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}

        {filteredChats.length === 0 && (
          <div className="px-4 py-12 text-center">
            <Search className="mx-auto mb-3 text-slate-300" size={28} />
            <p className="text-sm font-medium text-slate-600">
              No conversations found
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Try another search.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function MessageBubble({ message }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${message.mine ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${
          message.mine
            ? "rounded-br-md bg-[#DCFCE7] text-[#0F172A]"
            : "rounded-bl-md border border-[#E2E8F0] bg-white text-[#0F172A]"
        }`}
      >
        <p className="break-words text-sm leading-6">{message.text}</p>

        <div className="mt-1.5 flex items-center justify-end gap-1.5">
          <span className="text-[10px] text-slate-400">
            {message.time}
          </span>

          {message.mine && (
            <CheckCheck size={14} className="text-[#059669]" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ChatWindow({ chat, onBack, onSendMessage }) {
  const [message, setMessage] = useState("");

  if (!chat) {
    return (
      <section className="hidden h-full flex-col items-center justify-center bg-[#F8FAFC] p-8 text-center md:flex">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#DCFCE7] text-[#059669]">
          <MessageCircle size={36} />
        </div>

        <h2 className="text-xl font-bold text-[#0F172A]">
          Your conversations start here
        </h2>

        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
          Select a conversation to send messages and stay connected.
        </p>
      </section>
    );
  }

  function handleSubmit(event) {
    event.preventDefault();

    const text = message.trim();

    if (!text) return;

    onSendMessage(chat.id, text);
    setMessage("");
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col bg-[#F8FAFC]">
      <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 md:hidden"
            aria-label="Back to conversations"
          >
            <ArrowLeft size={20} />
          </button>

          <Avatar chat={chat} size="h-10 w-10" />

          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-[#0F172A]">
              {chat.name}
            </h3>

            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
              <span
                className={`h-2 w-2 rounded-full ${
                  chat.online ? "bg-emerald-500" : "bg-slate-300"
                }`}
              />
              {chat.online ? "Online" : chat.group ? "Group conversation" : "Offline"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            className="hidden rounded-xl p-2.5 text-slate-500 transition hover:bg-[#DCFCE7] hover:text-[#059669] sm:block"
            aria-label="Voice call"
          >
            <Phone size={19} />
          </button>

          <button
            className="hidden rounded-xl p-2.5 text-slate-500 transition hover:bg-[#DCFCE7] hover:text-[#059669] sm:block"
            aria-label="Video call"
          >
            <Video size={20} />
          </button>

          <button
            className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100"
            aria-label="Conversation options"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 sm:p-6">
        <div className="mx-auto rounded-full border border-[#E2E8F0] bg-white px-4 py-1.5 text-[10px] font-medium text-slate-500">
          TODAY
        </div>

        <AnimatePresence initial={false}>
          {chat.messages.map((item) => (
            <MessageBubble key={item.id} message={item} />
          ))}
        </AnimatePresence>
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-[#E2E8F0] bg-white p-3 sm:p-4"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-2 transition focus-within:border-[#059669] focus-within:ring-2 focus-within:ring-emerald-100">
          <button
            type="button"
            className="hidden rounded-xl p-2 text-slate-400 transition hover:bg-[#DCFCE7] hover:text-[#059669] sm:block"
            aria-label="Add emoji"
          >
            <Smile size={21} />
          </button>

          <button
            type="button"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-[#DCFCE7] hover:text-[#059669]"
            aria-label="Attach a file"
          >
            <Paperclip size={20} />
          </button>

          <button
            type="button"
            className="hidden rounded-xl p-2 text-slate-400 transition hover:bg-[#DCFCE7] hover:text-[#059669] sm:block"
            aria-label="Attach an image"
          >
            <ImageIcon size={20} />
          </button>

          <textarea
            rows={1}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form.requestSubmit();
              }
            }}
            placeholder="Write a message..."
            className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400"
            aria-label="Message text"
          />

          <motion.button
            type="submit"
            whileHover={{ scale: 1.06, rotate: -4 }}
            whileTap={{ scale: 0.92 }}
            disabled={!message.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#059669] text-white shadow-md shadow-emerald-100 transition hover:bg-[#047857] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message"
          >
            <Send size={18} />
          </motion.button>
        </div>

        <p className="mt-2 hidden text-center text-[10px] text-slate-400 sm:block">
          Press Enter to send · Shift + Enter for a new line
        </p>
      </form>
    </section>
  );
}

export default function App() {
  const [chats, setChats] = useState(initialChats);
  const [selectedChat, setSelectedChat] = useState(initialChats[0]);
  const [activeNav, setActiveNav] = useState("Chats");
  const [search, setSearch] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [showChatList, setShowChatList] = useState(true);

  function handleSendMessage(chatId, text) {
    const newMessage = {
      id: Date.now(),
      text,
      mine: true,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setChats((currentChats) =>
      currentChats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              message: text,
              time: newMessage.time,
              messages: [...chat.messages, newMessage],
            }
          : chat
      )
    );

    setSelectedChat((current) =>
      current?.id === chatId
        ? {
            ...current,
            message: text,
            time: newMessage.time,
            messages: [...current.messages, newMessage],
          }
        : current
    );
  }

  function handleNewChat() {
    const name = window.prompt("Enter a conversation name:");

    if (!name?.trim()) return;

    const newChat = {
      id: Date.now(),
      name: name.trim(),
      message: "Start a conversation",
      time: "Now",
      unread: 0,
      online: false,
      color: "bg-emerald-100",
      initials: name.trim().slice(0, 2).toUpperCase(),
      messages: [],
    };

    setChats((current) => [newChat, ...current]);
    setSelectedChat(newChat);
    setActiveNav("Chats");
    setShowChatList(false);
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-0 text-[#0F172A] sm:p-3 lg:p-5">
      <div className="mx-auto flex h-dvh max-w-[1800px] overflow-hidden border-[#E2E8F0] bg-white sm:h-[calc(100dvh-24px)] sm:rounded-3xl sm:border sm:shadow-xl sm:shadow-slate-200/50 lg:h-[calc(100dvh-40px)]">
        {/* Desktop sidebar */}
        <div className="hidden w-[230px] shrink-0 lg:block">
          <Sidebar
            activeNav={activeNav}
            setActiveNav={setActiveNav}
          />
        </div>

        {/* Mobile sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden"
              onClick={() => setShowSidebar(false)}
            >
              <motion.div
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: "spring", damping: 28 }}
                className="h-full w-[280px] max-w-[85vw]"
                onClick={(event) => event.stopPropagation()}
              >
                <Sidebar
                  activeNav={activeNav}
                  setActiveNav={setActiveNav}
                  onClose={() => setShowSidebar(false)}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversation list */}
        <div
          className={`${
            showChatList ? "flex" : "hidden"
          } w-full min-w-0 flex-col md:flex md:w-[320px] md:shrink-0 xl:w-[365px]`}
        >
          <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-4 py-3 lg:hidden">
            <button
              onClick={() => setShowSidebar(true)}
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>

            <span className="font-bold">ChatApp</span>

            <button
              onClick={handleNewChat}
              className="rounded-xl p-2 text-[#059669] transition hover:bg-[#DCFCE7]"
              aria-label="New conversation"
            >
              <Plus size={21} />
            </button>
          </div>

          <ChatList
            chats={chats}
            selectedChat={selectedChat}
            setSelectedChat={(chat) => {
              setSelectedChat(chat);
              setShowChatList(false);
            }}
            search={search}
            setSearch={setSearch}
            activeNav={activeNav}
            onNewChat={handleNewChat}
          />
        </div>

        {/* Conversation window */}
        <div
          className={`${
            showChatList ? "hidden" : "flex"
          } min-h-0 min-w-0 flex-1 flex-col md:flex`}
        >
          <ChatWindow
            chat={selectedChat}
            onBack={() => setShowChatList(true)}
            onSendMessage={handleSendMessage}
          />
        </div>

        {/* Mobile bottom navigation */}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-[#E2E8F0] bg-white px-2 pb-[env(safe-area-inset-bottom)] pt-2 md:hidden">
          {[
            { label: "Chats", icon: MessageCircle },
            { label: "Groups", icon: Users },
            { label: "Contacts", icon: UserRound },
            { label: "Settings", icon: Settings },
          ].map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => {
                setActiveNav(label);
                setShowChatList(true);
              }}
              className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium transition ${
                activeNav === label
                  ? "text-[#059669]"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </main>
  );
}