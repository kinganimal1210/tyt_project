import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CAMP 전남대 팀 매칭 플랫폼',
  description: '전남대학교 학생을 위한 팀 구성/모집 플랫폼',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <header className="h-16 flex items-center justify-between px-4 border-b bg-white/60 backdrop-blur">
          <div className="font-semibold">TYT</div>
          <nav className="text-sm opacity-80">전남대 팀 매칭</nav>
        </header>
        <main className="min-h-[calc(100dvh-4rem)]">{children}</main>
        <footer className="border-t text-xs text-muted-foreground py-4 px-4 text-center">
          © {new Date().getFullYear()} TYT @ CNU
        </footer>
      </body>
    </html>
  );
}