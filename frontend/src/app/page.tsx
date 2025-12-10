// src/app/page.tsx
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

// 앱에서 사용할 최소 타입
type User = {
  id: string;
  name: string;
  email: string;
  department: string;
  year: number;
};

type Profile = any;   // posts + author 구조 (FeedList/FeedDetailModal에서 쓰는 타입)
type ChatInit = any;

export default function Home() {
  // 로그인 상태
  const [user, setUser] = useState<User | null>(null);

  // 모달/상태
  const [openProfileForm, setOpenProfileForm] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);

  // 현재 수정 중인 프로필
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  // 채팅
  const [showChat, setShowChat] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [initialChat, setInitialChat] = useState<ChatInit | null>(null);

  // 프로필 목록
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [viewMode, setViewMode] = useState<'recruit' | 'ai'>('recruit');

  // 로그인 성공 콜백
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
    setEditingProfile(null);
  };

  // DM 채팅 시작
  const handleChatStart = (target?: any) => {
    if (!target) {
      alert('채팅할 상대 정보가 없습니다.');
      return;
    }

    console.log('[handleChatStart] target =', target);
    setInitialChat(target);
    setShowChat(true);
    setHasNewMessages(false);
  };

  // posts 테이블에서 프로필 목록 가져오기
  const fetchProfiles = async () => {
    if (!user) return;

    try {
      setIsLoadingProfiles(true);

      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          title,
          description,
          skills,
          interests,
          available,
          personality,
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
          error.hint,
        );
        return;
      }

      const rows = data ?? [];

      // UI에서 기대하는 구조로 author 필드 추가
      const normalized = rows.map((row: any) => ({
        ...row,
        author: {
          id: row.profiles?.id,
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

  // 로그인 후 프로필 목록 로딩
  useEffect(() => {
    if (!user) return;
    fetchProfiles();
  }, [user]);

  // 새 메시지 이벤트
  const handleNewMessage = () => {
    if (!showChat) setHasNewMessages(true);
  };

  // 피드 카드 클릭 -> 상세 모달
  const handleFeedClick = (profile: Profile) => {
    setSelectedProfile(profile);
  };

  // 내 프로필 보기 모달 오픈
  const handleProfileClick = () => {
    setShowUserProfileModal(true);
  };

  // 프로필 작성 버튼 (새로 작성)
  const handleCreateProfile = () => {
    setIsEditingProfile(false);
    setEditingProfile(null);
    setOpenProfileForm(true);
  };

  // 프로필 수정 버튼 (FeedDetailModal에서 호출)
  const handleEditProfile = (profile?: Profile) => {
    const target = profile ?? selectedProfile;

    if (!target) {
      console.warn('수정할 프로필이 없습니다.');
      return;
    }

    setIsEditingProfile(true);
    setEditingProfile(target);
    setOpenProfileForm(true);
  };

  // ✅ 프로필 삭제 버튼 (FeedDetailModal에서 호출)
  const handleDeleteProfile = async () => {
    if (!selectedProfile) return;

    const ok = window.confirm('이 피드를 삭제하시겠습니까?');
    if (!ok) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', selectedProfile.id);

      if (error) {
        console.error('피드 삭제 오류:', error.message, error.details);
        alert('삭제 중 오류가 발생했습니다.');
        return;
      }

      // 프론트 목록에서도 제거
      setProfiles((prev) =>
        prev.filter((p: any) => p.id !== selectedProfile.id),
      );

      // 모달 닫기
      setSelectedProfile(null);
    } catch (err: any) {
      console.error('피드 삭제 예외:', err?.message ?? err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 프로필 저장 (생성/수정 공통)
  const handleSubmitProfile = async (_data: any) => {
    // ProfileForm 안에서 DB upsert는 이미 수행됨
    setOpenProfileForm(false);
    setIsEditingProfile(false);
    setEditingProfile(null);

    // 최신 목록 다시 불러오기
    await fetchProfiles();
  };

  // 로그인 전
  if (!user) {
    return (
      <main className="min-h-screen">
        <LoginPage onLogin={handleLogin} />
      </main>
    );
  }

  // 로그인 후
  return (
    <main className="min-h-screen">
      <header className="border-b bg-white/80 backdrop-blur">
        <Navigation
          user={user}
          onLogout={handleLogout}
          onOpenChat={() => {
            setShowChat(true);
            setHasNewMessages(false);
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
          onDelete={handleDeleteProfile}         
          onChatStart={() => handleChatStart(selectedProfile)}
          isOwner={selectedProfile?.author?.id === user.id}
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

      {/* 프로필 작성/수정 폼 */}
      {openProfileForm && (
        <ProfileForm
          onClose={() => {
            setOpenProfileForm(false);
            setIsEditingProfile(false);
            setEditingProfile(null);
          }}
          onSubmit={handleSubmitProfile}
          initialData={isEditingProfile ? editingProfile ?? undefined : undefined}
          isEditing={isEditingProfile}
        />
      )}

      {/* 채팅 시스템 */}
      {showChat && (
        <ChatSystem
          onClose={() => setShowChat(false)}
          currentUser={user}
          initialChat={initialChat ?? undefined}
          onNewMessage={handleNewMessage}
        />
      )}
    </main>
  );
}
