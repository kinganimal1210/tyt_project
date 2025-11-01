'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { MessageCircle, User, LogOut, Plus } from 'lucide-react';

interface NavigationProps {
  user: any;
  onLogout: () => void;
  onOpenChat: () => void;
  onCreateProfile: () => void;
  onProfileClick: () => void;
  hasNewMessages?: boolean;
}

export default function Navigation({ user, onLogout, onOpenChat, onCreateProfile, onProfileClick, hasNewMessages }: NavigationProps) {
  return (
    <nav className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold">
              <span className="text-primary">팀</span>
              <span style={{ color: 'var(--color-success)' }}>모집</span>
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onCreateProfile}
              className="flex items-center gap-2 border-green-200 hover:bg-green-50 hover:border-green-300 transition-colors"
              style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)' }}
            >
              <Plus className="h-4 w-4" />
              프로필 작성
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenChat}
              className="flex items-center gap-2 relative"
            >
              <MessageCircle className="h-4 w-4" />
              채팅
              {hasNewMessages && (
                <div 
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs text-white animate-pulse"
                  style={{ backgroundColor: 'var(--color-notification)' }}
                >
                  1
                </div>
              )}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:ring-2 hover:ring-green-200 transition-all">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-green-100 text-green-700">
                      {user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.department} {user?.year}학년
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onProfileClick}>
                  <User className="mr-2 h-4 w-4" />
                  <span>프로필</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>로그아웃</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}