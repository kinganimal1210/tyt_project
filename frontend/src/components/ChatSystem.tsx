'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { X, Send, Users } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
  isMe: boolean;
}

interface Chat {
  id: string;
  participant: {
    name: string;
    department: string;
    year: number;
  };
  lastMessage?: string;
  unreadCount: number;
  messages: Message[];
}

interface ChatSystemProps {
  onClose: () => void;
  currentUser: any;
  initialChat?: any;
  onNewMessage?: () => void;
}

export default function ChatSystem({ onClose, currentUser, initialChat, onNewMessage }: ChatSystemProps) {
  const [chats, setChats] = useState<Chat[]>([
    {
      id: '1',
      participant: {
        name: '이개발',
        department: '소프트웨어학과',
        year: 2
      },
      lastMessage: '안녕하세요! 프로젝트에 대해 더 자세히 알고 싶습니다.',
      unreadCount: 2,
      messages: [
        {
          id: '1',
          text: '안녕하세요! 프로필을 보고 연락드립니다.',
          sender: '이개발',
          timestamp: new Date(Date.now() - 3600000),
          isMe: false
        },
        {
          id: '2',
          text: '안녕하세요! 반갑습니다.',
          sender: currentUser.name,
          timestamp: new Date(Date.now() - 3000000),
          isMe: true
        },
        {
          id: '3',
          text: '프로젝트에 대해 더 자세히 알고 싶습니다.',
          sender: '이개발',
          timestamp: new Date(Date.now() - 1800000),
          isMe: false
        }
      ]
    },
    {
      id: '2',
      participant: {
        name: '박디자인',
        department: '디자인학과',
        year: 3
      },
      lastMessage: '포트폴리오 확인 부탁드립니다.',
      unreadCount: 0,
      messages: [
        {
          id: '1',
          text: '안녕하세요! 디자이너로 참여하고 싶습니다.',
          sender: '박디자인',
          timestamp: new Date(Date.now() - 7200000),
          isMe: false
        },
        {
          id: '2',
          text: '포트폴리오 확인 부탁드립니다.',
          sender: '박디자인',
          timestamp: new Date(Date.now() - 3600000),
          isMe: false
        }
      ]
    }
  ]);

  const [activeChat, setActiveChat] = useState<string | null>(chats[0]?.id || null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 초기 채팅이 있으면 새로운 채팅 추가
  useEffect(() => {
    if (initialChat) {
      const newChat: Chat = {
        id: `new-${Date.now()}`,
        participant: initialChat.author,
        lastMessage: '',
        unreadCount: 0,
        messages: []
      };
      
      setChats(prev => [newChat, ...prev]);
      setActiveChat(newChat.id);
    }
  }, [initialChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, activeChat]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const message: Message = {
      id: Date.now().toString(),
      text: newMessage.trim(),
      sender: currentUser.name,
      timestamp: new Date(),
      isMe: true
    };

    setChats(prev => prev.map(chat => 
      chat.id === activeChat 
        ? { 
            ...chat, 
            messages: [...chat.messages, message],
            lastMessage: message.text
          }
        : chat
    ));

    setNewMessage('');

    // Mock 응답 (실제 환경에서는 실시간 채팅 구현)
    setTimeout(() => {
      const mockResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: '네, 알겠습니다! 곧 답변드리겠습니다.',
        sender: chats.find(c => c.id === activeChat)?.participant.name || '',
        timestamp: new Date(),
        isMe: false
      };

      setChats(prev => prev.map(chat => 
        chat.id === activeChat 
          ? { 
              ...chat, 
              messages: [...chat.messages, mockResponse],
              lastMessage: mockResponse.text,
              unreadCount: chat.unreadCount + 1
            }
          : chat
      ));
      
      // 새 메시지 알림 트리거
      if (onNewMessage) {
        onNewMessage();
      }
    }, 1000);
  };

  const currentChat = chats.find(chat => chat.id === activeChat);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            채팅
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="flex-1 flex gap-4 min-h-0">
          {/* Chat List */}
          <div className="w-80 border-r space-y-2">
            <h3 className="font-medium mb-3">대화 목록</h3>
            <ScrollArea className="h-full">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    setActiveChat(chat.id);
                    setChats(prev => prev.map(c => 
                      c.id === chat.id ? { ...c, unreadCount: 0 } : c
                    ));
                  }}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    activeChat === chat.id 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {chat.participant.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">
                          {chat.participant.name}
                        </p>
                        {chat.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {chat.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {chat.participant.department} {chat.participant.year}학년
                      </p>
                      {chat.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {chat.lastMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 flex flex-col min-h-0">
            {currentChat ? (
              <>
                <div className="border-b pb-3 mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {currentChat.participant.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium">{currentChat.participant.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {currentChat.participant.department} {currentChat.participant.year}학년
                      </p>
                    </div>
                  </div>
                </div>

                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4">
                    {currentChat.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-3 py-2 ${
                            message.isMe
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{message.text}</p>
                          <p className={`text-xs mt-1 ${
                            message.isMe 
                              ? 'text-primary-foreground/70' 
                              : 'text-muted-foreground'
                          }`}>
                            {message.timestamp.toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <form onSubmit={handleSendMessage} className="flex gap-2 mt-4">
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
                채팅을 선택해주세요
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}