// src/app/api/create-profile/route.ts
// API Route - 회원가입 프로필 생성용
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // ✅ 서버 전용 키 (절대 NEXT_PUBLIC 쓰지 말기)

// 환경변수 체크 (개발 중 문제 빨리 발견용)
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Supabase URL 또는 SERVICE_ROLE_KEY가 설정되어 있지 않습니다.');
}

// 서버에서만 사용할 Supabase 클라이언트
const supabaseServer = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: Request) {
  try {
    const { id, name, email, department, year } = await req.json();

    if (!id || !email) {
      return NextResponse.json(
        { error: 'id와 email은 필수입니다.' },
        { status: 400 },
      );
    }

    // profiles 테이블에 프로필 생성/갱신
    const { error } = await supabaseServer
      .from('profiles')
      .upsert({ id, name, email, department, year });

    if (error) {
      console.error('Supabase profiles upsert error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('create-profile route error:', err);
    return NextResponse.json(
      { error: err?.message || '서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}