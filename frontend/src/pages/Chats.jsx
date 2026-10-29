
import { useState } from "react";
import { motion } from "framer-motion";

import Sidebar from "../components/chat/Sidebar";
import ChatList from "../components/chat/ChatList";
import ChatWindow from "../components/chat/ChatWindow";

export default function Chats() {
  const [selectedUser, setSelectedUser] = useState(null);

  return (
    <div className="h-screen overflow-hidden bg-[#F8FAFC] p-0 sm:p-3">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mx-auto flex h-full max-w-[1600px] overflow-hidden bg-white shadow-xl sm:rounded-2xl sm:border sm:border-[#E2E8F0]"
      >
        {/* Navigation sidebar */}
        <Sidebar />

        {/* User list */}
        <ChatList
          activeUserId={selectedUser?._id}
          onSelectUser={setSelectedUser}
        />

        {/* Selected user's chat window */}
        <ChatWindow selectedUser={selectedUser} />
      </motion.div>
    </div>
  );
}
