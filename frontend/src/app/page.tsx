'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

// 변환된 컴포넌트 (모두 default export 기준)
import LoginPage from '@/components/LoginPage';
import Navigation from '@/components/Navigation';
import Dashboard from '@/components/Dashboard';
import ProfileForm from '@/components/ProfileForm';
import ChatSystem from '@/components/ChatSystem';
import UserProfileModal from '@/components/UserProfileModal';
import FeedDetailModal from '@/components/FeedDetailModal';
import AIRecommend from '@/components/AIRecommend';

// 앱에서 사용할 최소 타입 (필요시 세부 타입으로 교체하세요)
type User = {
  id: string;
  name: string;
  email: string;
  department: string;
  year: number;
};
type Profile = any;   // Feed 카드/프로필 객체 형태 (컴포넌트 내부 타입에 맞게 조정 가능)
type ChatInit = any;  // 채팅 초기 대상/데이터

export default function Home() {
  // 로그인 상태
  const [user, setUser] = useState<User | null>(null);

  // 모달/상태
  const [openProfileForm, setOpenProfileForm] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);

  // 채팅
  const [showChat, setShowChat] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [initialChat, setInitialChat] = useState<ChatInit | null>(null);

  // UserProfileModal 등에 줄 전체 프로필 목록(필요시 실제 데이터로 갱신)
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [viewMode, setViewMode] = useState<'recruit' | 'ai'>('recruit');

  // 로그인 성공 콜백 (LoginPage -> 상위)
  const handleLogin = (u: User) => {
    setUser(u);
  };

  // 로그아웃
  const handleLogout = () => {
    setUser(null);
    setShowChat(false);
    setSelectedProfile(null);
    setOpenProfileForm(false);
    setShowUserProfileModal(false);
    setHasNewMessages(false);
    setInitialChat(null);
  };

  // [수정] 채팅 시작 (DM 전용, target 필수)
  const handleChatStart = (target?: any) => {
    if (!target) {
      alert('채팅할 상대 정보가 없습니다.');
      return;
    }

    console.log('[handleChatStart] target =', target);
    setInitialChat(target);   // ChatSystem에서 author/id를 뽑아서 씀
    setShowChat(true);
    setHasNewMessages(false);
  };

  const fetchProfiles = async () => {
  if (!user) return;

  try {
    setIsLoadingProfiles(true);

    const { data, error } = await supabase
      .from('posts')   // ✅ 상세 프로필 테이블 기준
      .select(`
        id,
        user_id,
        title,
        description,
        skills,
        interests,
        available,
        experience,
        contact,
        created_at,
        profiles (
          id,
          name,
          email,
          department,
          year
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(
        '프로필 목록 불러오기 오류:',
        error.message,
        error.details,
        error.hint
      );
      return;
    }

    const rows = data ?? [];

    // 🔧 UI가 기대하는 구조로 맞추기 (profile.author.* 사용 가능하게)
    const normalized = rows.map((row: any) => ({
      ...row,
      author: {
        id: row.profiles?.id,                    // DM용 uuid
        name: row.profiles?.name ?? '이름 없음',
        email: row.profiles?.email ?? '',
        department: row.profiles?.department ?? '',
        year: row.profiles?.year ?? undefined,
      },
    }));

      setProfiles(normalized);
    } catch (err: any) {
      console.error('프로필 목록 예외:', err?.message ?? err);
    } finally {
      setIsLoadingProfiles(false);
    }
  };


  // [수정] 로그인된 유저가 있으면 프로필 목록 한 번 불러오기
  useEffect(() => {
    if (!user) return;
    fetchProfiles();
  }, [user]);


  // 새 메시지 이벤트
  const handleNewMessage = (_msg: any) => {
    if (!showChat) setHasNewMessages(true);
  };

  // 피드(프로필) 카드 클릭 -> 상세 모달
  const handleFeedClick = (profile: Profile) => {
    setSelectedProfile(profile);
  };

  // 내 프로필 보기 모달 오픈
  const handleProfileClick = () => {
    setShowUserProfileModal(true);
  };

  // 프로필 생성/수정 폼
  const handleCreateProfile = () => {
    setIsEditingProfile(false);
    setOpenProfileForm(true);
  };
  const handleEditProfile = (profile?: Profile) => {
    setIsEditingProfile(true);
    setOpenProfileForm(true);
  };

  // 프로필 저장 (생성/수정 공통)
  const handleSubmitProfile =  async (data: any) => {
    // TODO: 서버 저장 로직 연결 후 목록 갱신
    setOpenProfileForm(false);
    setIsEditingProfile(false);

    await fetchProfiles(); //[수정]supabase에서 프로필 가져오기
  };

  // 로그인 전: 로그인 UI만 노출
  if (!user) {
    return (
      <main className="min-h-screen">
        <LoginPage onLogin={handleLogin} />
      </main>
    );
  }

  // 로그인 후: 내비 + 본문(대시보드) + 각종 모달
  return (
    <main className="min-h-screen">
      <header className="border-b bg-white/80 backdrop-blur">
        <Navigation
          user={user}
          onLogout={handleLogout}
          onOpenChat={() => {
            if (!initialChat) {
              alert('채팅할 상대를 먼저 선택한 뒤, 피드/프로필에서 "채팅" 버튼을 눌러 주세요.');
                return;
            }
              setShowChat(true);
            }}
          onCreateProfile={handleCreateProfile}
          onProfileClick={handleProfileClick}
          hasNewMessages={hasNewMessages}
          onOpenRecruit={() => setViewMode('recruit')}
          onOpenAIRecommend={() => setViewMode('ai')}
        />
      </header>

      <section className="container mx-auto p-4">
        {viewMode === 'recruit' && (
          <Dashboard
            onChatStart={handleChatStart}
            onFeedClick={handleFeedClick}
            profiles={profiles}
          />
        )}
        {viewMode === 'ai' && <AIRecommend />}
      </section>

      {/* 프로필 상세 모달 */}
      {selectedProfile && (
        <FeedDetailModal
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onEdit={handleEditProfile}
          onDelete={() => {
            // TODO: 삭제 로직
            setSelectedProfile(null);
          }}
          onChatStart={() => handleChatStart(selectedProfile)}
          isOwner={Boolean((selectedProfile as any)?.author?.name === user?.name)}
        />
      )}

      {/* 내 프로필 보기 모달 */}
      {showUserProfileModal && (
        <UserProfileModal
          user={user}
          profiles={profiles}
          onClose={() => setShowUserProfileModal(false)}
          onFeedClick={handleFeedClick}
        />
      )}

      {/* 프로필 생성/수정 폼 */}
      {openProfileForm && (
        <ProfileForm
          onClose={() => {
            setOpenProfileForm(false);
            setIsEditingProfile(false);
          }}
          onSubmit={handleSubmitProfile}
          initialData={isEditingProfile ? (user as any) : undefined}
          isEditing={isEditingProfile}
        />
      )}

      {/* 채팅 시스템 */}
      {showChat && initialChat && (
        <ChatSystem
          onClose={() => setShowChat(false)}
          currentUser={user}
          initialChat={initialChat}
          onNewMessage={handleNewMessage}
        />
      )}
    </main>
  );
}