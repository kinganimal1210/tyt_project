// frontend/src/app/chat/page.tsx
"use client";
import { useState } from "react";
import { useChat } from "@/hooks/useChat";

export default function ChatRoom() {
  const [chatId] = useState("c2becd06-641f-4e40-86d9-6d5ec05de67c"); // Chats.id (위 SQL에서 만든 것)
  const [userId] = useState("90269f4a-81b3-440b-a29c-79d6f15bba08"); // profiles.id

  const { messages, send } = useChat(chatId, userId);
  const [text, setText] = useState("");

  return (
    <div className="p-4 space-y-3">
      <div className="h-80 overflow-y-auto border rounded p-2">
        {messages.map((m, i) => (
          <div key={i}>
            <b>{m.sender_id === userId ? "나" : m.sender_id}</b>: {m.content}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
          setText("");
        }}
        className="flex gap-2"
      >
        <input
          className="border rounded px-2 py-1 flex-1"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="메시지 입력"
        />
        <button className="border rounded px-3">Send</button>
      </form>
    </div>
  );
}
