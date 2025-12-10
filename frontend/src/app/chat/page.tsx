"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useChat } from "@/hooks/useChat";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("user") ?? "anonymous";
  const chatId = "c2becd06-641f-4e40-86d9-6d5ec05de67c";

  const { messages, send } = useChat(chatId, userId);
  const [text, setText] = useState("");

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold">Chat Room</h1>
      <div className="h-80 overflow-y-auto border rounded p-2">
        {messages.map((m, i) => (
          <div key={i}>
            <b>{m.sender_id === userId ? "나" : "상대방"}</b>: {m.content}
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
