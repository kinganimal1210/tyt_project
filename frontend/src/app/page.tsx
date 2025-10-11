'use client';
import LoginPage from '@/components/login';

export default function Page() {
  const handleLogin = (userInfo: {
    id: string;
    name: string;
    email: string;
    department: string;
    year: number;
  }) => {
    console.log('로그인 완료! 사용자 정보:', userInfo);
    // 여기서 필요하면 상태에 저장하거나, 다른 페이지로 이동 가능
  };

  return <LoginPage onLogin={handleLogin} />;
}
