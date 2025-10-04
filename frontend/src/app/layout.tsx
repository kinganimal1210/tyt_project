// src/app/layout.tsx
import './globals.css';

// 공통 layout 컴포넌트
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}