// frontend/src/hooks/useChat.ts
"use client";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";

type Message = {
  id?: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at?: string;
};

export function useChat(chatId: string, userId: string) {
  const s = useRef(getSocket());
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    s.current.emit("join", { chatId, userId });

    const onMsg = (msg: Message) => {
      if (msg.chat_id === chatId) setMessages(prev => [...prev, msg]);
    };

    s.current.on("chat:message", onMsg);
    return () => {
      s.current.off("chat:message", onMsg);
    };
  }, [chatId, userId]);

  const send = (text: string) => {
    if (!text.trim()) return;
    s.current.emit("chat:message", { chatId, senderId: userId, content: text });
  };

  return { messages, send };
}
