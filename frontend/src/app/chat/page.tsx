// src/app/chat/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chat',
};

// 현재 채팅은 메인 페이지의 ChatSystem 모달로 제공되므로,
// /chat 페이지는 비워 둔다.
export default function ChatPage() {
  return null;
}