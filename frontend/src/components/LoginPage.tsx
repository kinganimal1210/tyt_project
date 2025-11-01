// 로그인 & 회원가입 페이지 컴포넌트
'use client'; // 클라이언트 컴포넌트 선언 (react hooks 사용 가능)

import { useState } from 'react'; // 상태 관리를 위한 react hooks
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

// LoginPage 컴포넌트가 받을 Props 타입 정의
export type LoginPageProps = {
  onLogin: (userInfo: {
    id: string;
    name: string;
    email: string;
    department: string;
    year: number;
  }) => void; // 로그인 성공 시 호출되는 콜백 함수
};

// 로그인 페이지 컴포넌트
export default function LoginPage({ onLogin }: LoginPageProps) {
  const [isLoading, setIsLoading] = useState(false);  // 로그인, 회원가입 상태 관리

/*
    로그인 버튼 클릭 시 실행 이벤트 핸들러
    - 기본 제출 방지
    - 로딩 상태로 전환
    - 400ms 후 데모용 사용자 정보로 로그인 처리
    - 로딩 상태 해제
*/
  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {  
    e.preventDefault(); // 기본 제출 방지
    if (isLoading) return; // 중복 제출 방지
    setIsLoading(true); // 로딩 상태로 전환

    // 폼에서 값 읽기 (이메일/비밀번호)
    const fd = new FormData(e.currentTarget);
    const email = (fd.get('email') as string) || '';
    const nameGuess = email.split('@')[0] || '사용자';

    // 실제 환경이라면 여기서 Supabase Auth 호출
    // 데모용: 300ms 후 로그인 성공 처리
    setTimeout(() => {
      onLogin({
        id: '1',
        name: nameGuess,
        email,
        department: '컴퓨터정보통신공학과',
        year: 3,
      });
      setIsLoading(false); // 로딩 종료
    }, 300);
  };

 /*   회원가입 버튼 클릭 시 실행 이벤트 핸들러
    - 기본 제출 방지
    - 로딩 상태로 전환
    - Supabase 연동 시 여기에 회원가입 API 호출
    - 로딩 상태 해제
*/
  const handleSignup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // 기본 제출 방지
    if (isLoading) return; // 중복 제출 방지
    setIsLoading(true);  // 로딩 상태로 전환

    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string) || '신입학생';
    const email = (fd.get('signup-email') as string) || '';
    const department = (fd.get('department') as string) || '';
    const yearRaw = (fd.get('year') as string) || '1';
    const year = Number.parseInt(yearRaw, 10);
    
    // 실제 환경이라면 여기서 Supabase 회원가입 API 호출
    // 데모용: 300ms 후 회원가입 → 자동 로그인 처리
    setTimeout(() => {
      onLogin({
        id: '2',
        name,
        email,
        department,
        year: Number.isNaN(year) ? 1 : year,
      });
      setIsLoading(false); // 로딩 종료
    }, 300);
  };

  return (
    // 전체 화면 중앙 정렬 및 배경 스타일 적용(그라데이션)
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">TYT</CardTitle>
          <CardDescription>전남대학교 팀 모집을 위한 플랫폼에 오신 것을 환영합니다</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">로그인</TabsTrigger>
              <TabsTrigger value="signup">회원가입</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4"> {/* 로그인 폼 */}
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input id="email" type="email" placeholder="student@jnu.ac.kr" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호</Label>
                  <Input id="password" type="password" required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>  {/* 로그인 대기 상태 */}
                  {isLoading ? '로그인 중...' : '로그인'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4"> {/* 회원가입 폼 */}
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <Input id="name" type="text" placeholder="오민규" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">이메일</Label>
                  <Input id="signup-email" type="email" placeholder="student@jnu.ac.kr" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">학과</Label>
                  <Input id="department" type="text" placeholder="컴퓨터정보통신공학과" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">학년</Label>
                  <Input id="year" type="number" placeholder="3" min={1} max={6} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">비밀번호</Label>
                  <Input id="signup-password" type="password" required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}> {/* 회원가입 대기 상태 */}
                  {isLoading ? '가입 중...' : '회원가입'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}