// src/app/page.tsx
'use client';

import LoginPage from '@/components/login';

// 공통 page 컴포넌트
export default function Home() {
  return <LoginPage onLogin={() => { /* demo: no-op */ }} />;
}