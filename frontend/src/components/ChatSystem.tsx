// frontend/src/components/ChatSystem.tsx
// [수정] DM 전용 채팅 컴포넌트 (global-chat 없음)

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { X, Send, Users } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
  isMe: boolean;
}

interface UserInfo {
  id: string;
  name: string;
  department?: string;
  year?: number;
}

interface ChatSystemProps {
  onClose: () => void;
  currentUser: UserInfo;
  initialChat: any;         // [중요] page.tsx에서 넘겨주는 target(=프로필/author 객체)
  onNewMessage?: () => void;
}

// [수정] 두 유저 uuid로 항상 동일한 DM 방 ID 생성
const makeDmChatId = (a: string, b: string) =>
  `dm:${[a, b].sort().join('_')}`;

// 서버 row → Message
function fromSupabaseRow(row: any, meId: string): Message {
  const id = String(row.id ?? `${row.sender_id}-${row.created_at ?? Date.now()}`);
  const text = String(row.content ?? '');
  const senderId = String(row.sender_id ?? '');
  const ts =
    typeof row.created_at === 'string'
      ? Date.parse(row.created_at)
      : typeof row.created_at === 'number'
      ? row.created_at
      : Date.now();

  return {
    id,
    text,
    senderId,
    timestamp: Number.isFinite(ts) ? ts : Date.now(),
    isMe: senderId === meId,
  };
}

export default function ChatSystem({
  onClose,
  currentUser,
  initialChat,
  onNewMessage,
}: ChatSystemProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // [수정] initialChat에서 상대 정보 뽑기 (profile.author 또는 profile 자체)
  const otherUser: UserInfo | null = useMemo(() => {
    if (!initialChat) return null;
    const src = initialChat.author ?? initialChat;

    if (!src?.id) {
      console.warn('[ChatSystem] initialChat에 id가 없습니다.', initialChat);
      return null;
    }

    return {
      id: src.id,
      name: src.name ?? src.nickname ?? '상대방',
      department: src.department ?? src.major,
      year:
        typeof src.year === 'number'
          ? src.year
          : typeof src.grade === 'number'
          ? src.grade
          : undefined,
    };
  }, [initialChat]);

  // [수정] DM 방 ID
  const chatId = useMemo(() => {
    if (!otherUser) return null;
    return makeDmChatId(currentUser.id, otherUser.id);
  }, [currentUser.id, otherUser]);

  const SERVER_URL = useMemo(
    () => process.env.NEXT_PUBLIC_CHAT_SERVER_URL ?? 'http://localhost:4000',
    []
  );

  // [수정] 소켓 연결 & DM 방 join (global-chat 안 씀)
  useEffect(() => {
    if (!chatId) {
      console.warn('[ChatSystem] chatId가 없습니다. DM 방에 join할 수 없습니다.');
      return;
    }

    const s = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
    });

    socketRef.current = s;

    s.on('connect', () => {
      console.log('[socket] connected', s.id);
      console.log('[socket] join DM room', chatId, 'as', currentUser.id);
      s.emit('join', { chatId, userId: currentUser.id });
    });

    s.on('chat:message', (row: any) => {
      const rowChatId: string = row.chat_id ?? '';
      if (rowChatId !== chatId) return; // 이 DM 방이 아닌 메시지는 무시

      const msg = fromSupabaseRow(row, currentUser.id);
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (onNewMessage) onNewMessage();
    });

    s.on('system', (text: string) => {
      console.log('[system]', text);
    });

    s.on('disconnect', () => {
      console.log('[socket] disconnected');
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [SERVER_URL, chatId, currentUser.id, onNewMessage]);

  // 메시지 바뀔 때 맨 아래로 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId) return;
    const text = newMessage.trim();
    const s = socketRef.current;
    if (!s) return;

    setNewMessage('');

    console.log('[send] to', chatId, 'text =', text);
    s.emit('chat:message', {
      chatId,
      senderId: currentUser.id,
      content: text,
    });
    if (onNewMessage) onNewMessage && onNewMessage();
  };

  // 상대 정보가 없으면 에러 표시
  if (!otherUser || !chatId) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>채팅을 열 수 없습니다</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              상대 정보(initialChat)에 id가 없어서 DM 방을 만들 수 없습니다.
              피드/프로필에서 다시 채팅을 열어보세요.
            </p>
            <Button onClick={onClose}>닫기</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl h-[80vh] flex flex-col">
        <CardHeader className="space-y-0 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {otherUser.name}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-1 hover:bg-muted">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {otherUser.department ?? '미입력'} {otherUser.year ?? 1}학년 {otherUser.name}님과의 1:1 채팅입니다.
          </p>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col min-h-0">
          {/* 메시지 리스트 */}
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-3 py-2 ${
                      m.isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">
                      {m.isMe ? (
                        <span className="font-semibold mr-2">나:</span>
                      ) : (
                        <span className="font-semibold mr-2">상대방:</span>
                      )}
                      {m.text}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        m.isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}
                    >
                      {new Date(m.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* 입력창 */}
          <form onSubmit={handleSendMessage} className="flex gap-2 mt-3">
            <Input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="메시지를 입력하세요..."
              className="flex-1"
            />
            <Button type="submit" size="sm">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
