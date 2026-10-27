import { useEffect } from "react";
import { socket } from "../lib/socket";

function ChatMessages({ chatId, setMessages }) {
  useEffect(() => {
    if (!chatId) return;

    const handleNewMessage = (message) => {
      if (String(message.chat) !== String(chatId)) {
        return;
      }

      setMessages((previousMessages) => {
        const alreadyExists = previousMessages.some(
          (item) => item._id === message._id
        );

        if (alreadyExists) {
          return previousMessages;
        }

        return [...previousMessages, message];
      });
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [chatId, setMessages]);

  return null;
}

export default ChatMessages;