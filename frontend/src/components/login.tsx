// src/components/login.tsx
'use client';

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

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState<number>(1);
  const [message, setMessage] = useState('');

  const [user, setUser] = useState<null | {
    id: string;
    name: string;
    email: string;
    department: string;
    year: number;
  }>(null);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setIsLoading(true);
  setMessage('');

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    setMessage(`로그인 실패: ${error.message}`);
    setIsLoading(false);
    return;
  }

  const userId = data.user?.id;
  if (!userId) {
    setMessage('로그인은 되었으나 사용자 정보를 찾을 수 없습니다.');
    setIsLoading(false);
    return;
  }

  // ✅ profiles 테이블에서 사용자 정보 조회
  const { data: profileData, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .maybeSingle();

  console.log('profileData:', profileData);
  console.log('profileError:', profileError);


  // ❌ SQL 오류 발생 시
  if (profileError) {
    console.error('프로필 조회 실패:', profileError);
    setMessage(`프로필 조회 실패: ${profileError.message}`);
    setIsLoading(false);
    return;
  }

  // ⚠️ profile이 존재하지 않을 때
  if (!profileData) {
    console.warn('프로필이 존재하지 않습니다. userId:', userId);
    setMessage('해당 사용자의 프로필이 존재하지 않습니다.');
    setIsLoading(false);
    return;
  }

  // ✅ 이제 onLogin 호출하지 않고 내부 state에 저장
    setUser({
      id: userId,
      name: profileData.name,
      email: profileData.email,
      department: profileData.department,
      year: profileData.year,
    });
  

  setMessage('로그인 성공!');
  setIsLoading(false);
};


  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try{
    // 1) Auth에 회원 생성
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(`회원가입 실패: ${error.message}`);
      setIsLoading(false);
      return;
    }

    console.log('회원가입 userId:', data.user?.id);
    
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      setMessage('회원가입 성공! (이메일 인증 후 로그인해주세요)');
      setIsLoading(false);
      return;
    }
    // data.user 가 바로 없을 수도 있음(이메일 확인 등). 가능한 경우 id를 사용
    const userId = userData.user.id;

    const res = await fetch('/api/createprofile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, name, email, department, year }),
    });

     const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || '프로필 생성 실패');

    setMessage('회원가입 및 프로필 저장 완료! 🎉');
    } catch (err: any) {
    setMessage(`회원가입 실패: ${err.message}`);
    } finally {
    setIsLoading(false);
  }

  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card className="w-[380px]">
        <CardHeader>
          <CardTitle>로그인 / 회원가입</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">로그인</TabsTrigger>
              <TabsTrigger value="signup">회원가입</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="flex flex-col gap-2 mt-3">
                <Label>이메일</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} required />
                <Label>비밀번호</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? '로그인 중...' : '로그인'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="flex flex-col gap-2 mt-3">
                <Label>이름</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
                <Label>이메일</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} required />
                <Label>비밀번호</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <Label>학과</Label>
                <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
                <Label>학년</Label>
                <Input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value) || 1)} />
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? '회원가입 중...' : '회원가입'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {message && <p className="text-sm text-center text-gray-600 mt-3">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
