// src/components/LoginPage.tsx
// --------------------------------------------------
// 로그인 / 회원가입 화면 컴포넌트
// - Supabase 인증(supabase.auth)과 profiles 테이블을 연동해서
//   사용자 정보를 가져오고, 상위 컴포넌트로 userInfo를 전달한다.
// - 탭(Tabs)을 이용해 "로그인" / "회원가입" UI를 한 화면에서 처리한다.
// - 전남대 학생 전용 서비스이므로, @jnu.ac.kr / @chonnam.ac.kr 이메일만 허용한다.
// --------------------------------------------------
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

// 상위(App/page 등)에서 로그인 성공 시 받을 user 정보 타입
export type LoginPageProps = {
  onLogin: (userInfo: {
    id: string;
    name: string;
    email: string;
    department: string;
    year: number;
  }) => void;
};

export default function LoginPage({ onLogin }: LoginPageProps) {
  // 공통 상태: 현재 요청 처리 중인지 여부, 하단 메시지(성공/실패 안내)
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // --------------------------------------------------
  // 1. 로그인 처리 함수
  //    - 이메일/비밀번호를 받아 Supabase auth.signInWithPassword 호출
  //    - 로그인 성공 후 profiles 테이블에서 추가 정보(name, department, year)를 조회
  //    - 조회한 정보를 onLogin 콜백으로 상위에 전달
  // --------------------------------------------------
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return; // 중복 요청 방지

    setIsLoading(true);
    setMessage('');

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') ?? '');
    const password = String(fd.get('password') ?? '');

    // 전남대학교/전남대(@jnu.ac.kr, @chonnam.ac.kr) 이메일만 로그인 허용
    const isJnu = email.endsWith('@jnu.ac.kr');
    const isChonnam = email.endsWith('@chonnam.ac.kr');
    if (!isJnu && !isChonnam) {
      setMessage('전남대학교 학생 이메일(@jnu.ac.kr 또는 @chonnam.ac.kr)만 로그인할 수 있습니다.');
      setIsLoading(false);
      return;
    }

    try {
      // 1) Supabase 이메일/비밀번호 로그인 시도
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);

      // 2) 인증에 성공했다면 user id 확보
      const userId = data.user?.id;
      if (!userId) throw new Error('사용자 정보를 찾을 수 없습니다.');

      // 3) profiles 테이블에서 해당 유저의 프로필 정보 가져오기
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, name, email, department, year')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr) throw new Error(profileErr.message);
      if (!profile) throw new Error('해당 사용자의 프로필이 존재하지 않습니다.');

      // 4) 상위 컴포넌트에 로그인 완료 알림 (전역 상태 관리 등은 상위에서 처리)
      onLogin({
        id: userId,
        name: profile.name,
        email: profile.email,
        department: profile.department,
        year: profile.year,
      });

      setMessage('로그인 성공!');
    } catch (err: any) {
      console.error(err);
      setMessage(`로그인 실패: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --------------------------------------------------
  // 2. 회원가입 처리 함수
  //    - Supabase auth.signUp으로 계정을 생성
  //    - 성공 후 /api/create-profile 로 요청해서 profiles 테이블에 프로필을 생성
  //    - 프로젝트 설정에 따라 이메일 인증이 필요할 수 있음(그 경우 userId가 없을 수도 있음)
  // --------------------------------------------------
  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setMessage('');

    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') ?? '');
    const email = String(fd.get('signup-email') ?? '');
    const department = String(fd.get('department') ?? '');
    const year = Number(fd.get('year') ?? 1);
    const password = String(fd.get('signup-password') ?? '');

    // 전남대학교/전남대(@jnu.ac.kr, @chonnam.ac.kr) 이메일만 회원가입 허용
    const isJnuSignup = email.endsWith('@jnu.ac.kr');
    const isChonnamSignup = email.endsWith('@chonnam.ac.kr');
    if (!isJnuSignup && !isChonnamSignup) {
      setMessage('전남대학교 학생 이메일(@jnu.ac.kr 또는 @chonnam.ac.kr)만 회원가입할 수 있습니다.');
      setIsLoading(false);
      return;
    }

    try {
      // 1) Supabase 이메일/비밀번호 회원가입
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw new Error(error.message);

      // 2) userId 확보 (이메일 인증이 필요한 설정이라면 session은 없을 수 있음)
      const userId = data.user?.id || data.session?.user.id;

      // 3) 이메일 인증이 필수인 경우, userId가 없으면 여기서 종료
      if (!userId) {
        setMessage('회원가입 성공! 이메일 인증 후 로그인해 주세요.');
        return;
      }

      // 4) 서버 API로 프로필 생성
      //    - /api/create-profile/route.ts 에서 service_role 키로 실제 DB insert 처리
      const res = await fetch('/api/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, name, email, department, year }),
      });

      // 5) 응답 코드 체크 (실패 시 텍스트를 에러로 표시)
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || '프로필 생성 실패');
      }

      // 6) 여기까지 오면 회원가입 + 프로필 저장까지 완료
      setMessage('회원가입 및 프로필 저장 완료! 이메일을 확인한 뒤 로그인해 주세요.');
    } catch (err: any) {
      console.error(err);
      setMessage(`회원가입 실패: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --------------------------------------------------
  // 3. 렌더링: 카드 + 탭 기반 UI
  //    - 로그인 / 회원가입 폼을 각각 TabsContent로 분리
  //    - 하단에 message 상태를 표시해서 에러/안내를 보여줌
  // --------------------------------------------------
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">TYT</CardTitle>
          <CardDescription>전남대학교 팀 모집 플랫폼</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">로그인</TabsTrigger>
              <TabsTrigger value="signup">회원가입</TabsTrigger>
            </TabsList>

            {/* 로그인 탭 */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="student@jnu.ac.kr"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호</Label>
                  <Input id="password" name="password" type="password" required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? '로그인 중...' : '로그인'}
                </Button>
              </form>
            </TabsContent>

            {/* 회원가입 탭 */}
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <Input id="name" name="name" type="text" placeholder="홍길동" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">이메일</Label>
                  <Input
                    id="signup-email"
                    name="signup-email"
                    type="email"
                    placeholder="student@jnu.ac.kr"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">학과</Label>
                  <Input
                    id="department"
                    name="department"
                    type="text"
                    placeholder="컴퓨터정보통신공학과"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">학년</Label>
                  <Input
                    id="year"
                    name="year"
                    type="number"
                    placeholder="3"
                    min={1}
                    max={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">비밀번호</Label>
                  <Input id="signup-password" name="signup-password" type="password" required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? '가입 중...' : '회원가입'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* 에러/안내 메시지 출력 영역 */}
          {message && (
            <p className="text-sm text-center text-gray-600 mt-3 whitespace-pre-line">{message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}