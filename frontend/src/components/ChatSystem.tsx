// frontend/src/components/ChatSystem.tsx
// 채팅 목록 + 1:1 DM 채팅 UI

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X, Send, Users } from 'lucide-react';

import { supabase } from '@/lib/supabaseClient';

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

interface Conversation {
  chatId: string;
  otherUser: UserInfo;
  lastMessage?: string;
  lastAt?: string;
  unreadCount: number;
}

interface ChatSystemProps {
  onClose: () => void;
  currentUser: UserInfo;
  initialChat?: any; // 피드/프로필에서 넘겨주는 author 객체 (옵션)
  onNewMessage?: () => void;
}

// 두 유저 uuid로 항상 동일한 DM 방 ID 생성
const makeDmChatId = (a: string, b: string) =>
  `dm:${[a, b].sort().join('_')}`;

// Supabase Messages row → Message
function fromSupabaseRow(row: any, meId: string): Message {
  const id = String(
    row.id ?? `${row.sender_id}-${row.created_at ?? Date.now()}`
  );
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const activeChatId = activeConversation?.chatId ?? null;
  const activeOtherUser = activeConversation?.otherUser ?? null;

  const SERVER_URL = useMemo(
    () => process.env.NEXT_PUBLIC_CHAT_SERVER_URL ?? 'http://localhost:4000',
    []
  );

  /* ------------------------------------------------------------------ */
  /* 1. 대화 목록 불러오기 (Messages + profiles)                         */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1) 내가 참여한 모든 DM 메시지 가져오고 chat_id 로 그룹핑
      const { data, error } = await supabase
        .from('Messages')
        .select('chat_id, sender_id, content, created_at')
        .like('chat_id', `%${currentUser.id}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[ChatSystem] load conversations error', error);
        return;
      }
      if (!data || cancelled) return;

      type ConvBase = {
        chatId: string;
        otherUserId: string;
        lastMessage: string;
        lastAt: string;
      };

      const convMap = new Map<string, ConvBase>();

      for (const row of data) {
        const chatId: string = row.chat_id ?? '';
        if (!chatId) continue;

        const ids = chatId.replace(/^dm:/, '').split('_');
        const otherUserId =
          ids.find((id) => id !== currentUser.id) ?? ids[0] ?? '';

        const createdAt: string =
          row.created_at ??
          new Date().toISOString(); /* timestamptz string 이라고 가정 */
        const last = convMap.get(chatId);

        if (!last || createdAt > last.lastAt) {
          convMap.set(chatId, {
            chatId,
            otherUserId,
            lastMessage: String(row.content ?? ''),
            lastAt: createdAt,
          });
        }
      }

      const baseConvs = Array.from(convMap.values());
      const userIds = [
        ...new Set(baseConvs.map((c) => c.otherUserId).filter(Boolean)),
      ];

      // 2) 상대 프로필 정보 가져오기
      let profileMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profileRows, error: pError } = await supabase
          .from('profiles')
          .select('id, name, department, year')
          .in('id', userIds);

        if (pError) {
          console.error('[ChatSystem] load profile error', pError);
        }
        if (profileRows) {
          profileMap = new Map(profileRows.map((p) => [p.id, p]));
        }
      }

      let conversations: Conversation[] = baseConvs.map((c) => {
        const p = profileMap.get(c.otherUserId);
        const otherUser: UserInfo = {
          id: c.otherUserId,
          name: p?.name ?? '알 수 없음',
          department: p?.department ?? undefined,
          year: p?.year ?? undefined,
        };
        return {
          chatId: c.chatId,
          otherUser,
          lastMessage: c.lastMessage,
          lastAt: c.lastAt,
          unreadCount: 0, // 추후 읽음 처리 추가 가능
        };
      });

      // 3) initialChat 이 있으면 해당 상대와의 DM 방을 맨 위로/선택
      let initialConv: Conversation | null = null;
      if (initialChat) {
        const src = initialChat.author ?? initialChat;
        if (src?.id) {
          const otherUser: UserInfo = {
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
          const chatId = makeDmChatId(currentUser.id, otherUser.id);

          initialConv =
            conversations.find((c) => c.chatId === chatId) ??
            ({
              chatId,
              otherUser,
              lastMessage: '',
              lastAt: new Date().toISOString(),
              unreadCount: 0,
            } as Conversation);

          if (!conversations.some((c) => c.chatId === chatId)) {
            conversations = [initialConv, ...conversations];
          } else {
            // 이미 있던 방이면 맨 앞으로 옮겨도 됨
            conversations = [
              initialConv,
              ...conversations.filter((c) => c.chatId !== chatId),
            ];
          }
        }
      }

      if (!cancelled) {
        setConversations(conversations);
        if (initialConv) {
          setActiveConversation(initialConv);
        } else if (conversations.length > 0) {
          setActiveConversation(conversations[0]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser.id, initialChat]);

  /* ------------------------------------------------------------------ */
  /* 2. 선택된 대화방의 메시지 히스토리 로딩                           */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (!activeChatId) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('Messages')
        .select('*')
        .eq('chat_id', activeChatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[ChatSystem] load history error', error);
        return;
      }
      if (!data || cancelled) return;

      setMessages((prev) => {
        const history = data.map((row) =>
          fromSupabaseRow(row, currentUser.id)
        );
        const map = new Map<string, Message>();
        for (const m of [...history, ...prev]) {
          map.set(m.id, m);
        }
        return Array.from(map.values()).sort(
          (a, b) => a.timestamp - b.timestamp
        );
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [activeChatId, currentUser.id]);

  /* ------------------------------------------------------------------ */
  /* 3. socket.io 연결 & 선택된 DM 방 join                              */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (!activeChatId || !activeOtherUser) return;

    const s = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
    });

    socketRef.current = s;

    s.on('connect', () => {
      console.log('[socket] connected', s.id);
      console.log(
        '[socket] join DM room',
        activeChatId,
        'as',
        currentUser.id
      );
      s.emit('join', { chatId: activeChatId, userId: currentUser.id });
    });

    s.on('chat:message', (row: any) => {
      const rowChatId: string = row.chat_id ?? '';
      if (rowChatId !== activeChatId) return;

      const msg = fromSupabaseRow(row, currentUser.id);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      // 대화 목록의 lastMessage 업데이트
      setConversations((prev) =>
        prev.map((conv) =>
          conv.chatId === rowChatId
            ? {
                ...conv,
                lastMessage: msg.text,
              }
            : conv
        )
      );

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
  }, [SERVER_URL, activeChatId, activeOtherUser, currentUser.id, onNewMessage]);

  /* ------------------------------------------------------------------ */
  /* 4. 메시지 변경 시 스크롤 맨 아래로                                  */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [messages]);

  /* ------------------------------------------------------------------ */
  /* 5. 메시지 전송                                                      */
  /* ------------------------------------------------------------------ */

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatId) return;

    const text = newMessage.trim();
    const s = socketRef.current;
    if (!s) return;

    setNewMessage('');

    console.log('[send] to', activeChatId, 'text =', text);

    s.emit('chat:message', {
      chatId: activeChatId,
      senderId: currentUser.id,
      content: text,
    });

    if (onNewMessage) onNewMessage();
  };

// UI
  const currentChat = activeConversation;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="relative w-full max-w-5xl h-[80vh] flex flex-col">
        {/* 상단 닫기 버튼 (오른쪽 위 고정) */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 shadow-none hover:bg-muted hover:shadow-md transition-colors transition-shadow"
        >
          <X className="h-4 w-4" />
        </Button>
        <CardHeader className="flex-row items-center space-y-0 pb-4 pr-10">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            채팅
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex gap-4 min-h-0">
          {/* 왼쪽: 대화 목록 */}
          <div className="w-80 border-r space-y-2">
            <h3 className="font-medium mb-3">대화 목록</h3>
            <ScrollArea className="h-full">
              {conversations.length === 0 && (
                <div className="text-xs text-muted-foreground px-2 py-1">
                  아직 대화가 없습니다.
                </div>
              )}
              {conversations.map((conv) => (
                <div
                  key={conv.chatId}
                  onClick={() => {
                    setActiveConversation(conv);
                    // 읽음 처리 추가 시 여기서 unreadCount 0으로 초기화
                    setConversations((prev) =>
                      prev.map((c) =>
                        c.chatId === conv.chatId
                          ? { ...c, unreadCount: 0 }
                          : c
                      )
                    );
                    setMessages([]); // 다른 방으로 바뀌면 메시지 초기화 후 다시 로딩
                  }}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    activeChatId === conv.chatId
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {conv.otherUser.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">
                          {conv.otherUser.name}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {conv.otherUser.department ?? '미입력'}{' '}
                        {conv.otherUser.year
                          ? `${conv.otherUser.year}학년`
                          : ''}
                      </p>
                      {conv.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {conv.lastMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>

          {/* 오른쪽: 선택된 대화의 메시지 */}
          <div className="flex-1 flex flex-col min-h-0">
            {currentChat && activeOtherUser ? (
              <>
                {/* 상단 상대 정보 */}
                <div className="border-b pb-3 mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {activeOtherUser.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium">
                        {activeOtherUser.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {activeOtherUser.department ?? '미입력'}{' '}
                        {activeOtherUser.year
                          ? `${activeOtherUser.year}학년`
                          : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 메시지 리스트 */}
                <div className="flex-1 overflow-y-auto pr-4">
                  <div className="space-y-4">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${
                          m.isMe ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-3 py-2 ${
                            m.isMe
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">
                            {m.text}
                          </p>
                          <p
                            className={`text-xs mt-1 ${
                              m.isMe
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground'
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
                <form
                  onSubmit={handleSendMessage}
                  className="flex gap-2 mt-4"
                >
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="메시지를 입력하세요..."
                    className="flex-1"
                  />
                  <Button type="submit" size="sm">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                대화를 선택해주세요
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}