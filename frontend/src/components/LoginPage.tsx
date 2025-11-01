<<<<<<< HEAD
// src/components/LoginPage.tsx
'use client';
=======
// 로그인 & 회원가입 페이지 컴포넌트
'use client'; // 클라이언트 컴포넌트 선언 (react hooks 사용 가능)
>>>>>>> b3c59548c5f729bcedbf6cd98ff6822f32875ff4

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

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
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 로그인
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setMessage('');

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') ?? '');
    const password = String(fd.get('password') ?? '');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);

      const userId = data.user?.id;
      if (!userId) throw new Error('사용자 정보를 찾을 수 없습니다.');

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, name, email, department, year')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr) throw new Error(profileErr.message);
      if (!profile) throw new Error('해당 사용자의 프로필이 존재하지 않습니다.');

      onLogin({
        id: userId,
        name: profile.name,
        email: profile.email,
        department: profile.department,
        year: profile.year,
      });

      setMessage('로그인 성공!');
    } catch (err: any) {
      setMessage(`로그인 실패: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 회원가입
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

    try {
      // 1) 이메일/비밀번호 회원가입
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw new Error(error.message);

      // 2) userId 확보 (이메일 인증 필요 설정이면 session은 없을 수 있음)
      const userId = data.user?.id || data.session?.user.id;

      // 3) 이메일 인증이 필요한 프로젝트 설정이라면 userId가 없을 수 있음
      if (!userId) {
        setMessage('회원가입 성공! 이메일 인증 후 로그인해 주세요.');
        return;
      }

      // 4) 서버 API로 프로필 생성 (서비스 롤 키가 route.ts에서 사용됨)
      const res = await fetch('/api/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, name, email, department, year }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || '프로필 생성 실패');
      }

      setMessage('회원가입 및 프로필 저장 완료! 이제 로그인하세요.');
    } catch (err: any) {
      setMessage(`회원가입 실패: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };


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

            {/* 로그인 */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input id="email" name="email" type="email" placeholder="student@jnu.ac.kr" required />
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

            {/* 회원가입 */}
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <Input id="name" name="name" type="text" placeholder="홍길동" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">이메일</Label>
                  <Input id="signup-email" name="signup-email" type="email" placeholder="student@jnu.ac.kr" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">학과</Label>
                  <Input id="department" name="department" type="text" placeholder="컴퓨터정보통신공학과" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">학년</Label>
                  <Input id="year" name="year" type="number" placeholder="3" min={1} max={6} required />
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

          {message && <p className="text-sm text-center text-gray-600 mt-3 whitespace-pre-line">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
