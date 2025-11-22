

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Profile, recommendByJaccard } from '@/lib/jaccardRecommend';

// Supabase 서버용 클라이언트 (SERVICE ROLE 키 사용)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)가 설정되어 있지 않습니다.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// posts 테이블에서 사용할 최소한의 컬럼 타입
type PostRow = {
  id: string;
  user_id: string;
  skills: string[] | null;    // jsonb 배열이라고 가정
  interests: string[] | null; // jsonb 배열이라고 가정
};

// 실제 추천 계산 로직 (GET/POST에서 공통 사용)
async function buildRecommendations(userId: string) {
  // 1) 내 최신 post 하나 가져오기 (자기소개 카드)
  const { data: mePost, error: meError } = await supabase
    .from('posts')
    .select('id, user_id, skills, interests')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<PostRow>();

  if (meError || !mePost) {
    throw new Error('해당 user_id에 대한 post가 없습니다.');
  }

  // posts → Profile 타입으로 매핑
  const me: Profile = {
    id: mePost.id,
    skill_tags: mePost.skills ?? [],
    interest_tags: mePost.interests ?? [],
    role_tags: null, // 아직 role 컬럼이 없으므로 null
  };

  // 2) 다른 사람들의 post (후보) 가져오기
  const { data: candidateRows, error: candError } = await supabase
    .from('posts')
    .select('id, user_id, skills, interests')
    .neq('user_id', userId);

  if (candError || !candidateRows) {
    throw new Error('후보 posts 를 불러오지 못했습니다.');
  }

  const candidates: Profile[] = (candidateRows as PostRow[]).map((p) => ({
    id: p.id,
    skill_tags: p.skills ?? [],
    interest_tags: p.interests ?? [],
    role_tags: null,
  }));

  // 3) Jaccard 기반 추천 계산
  const recs = recommendByJaccard(me, candidates, 20);

  // 4) 로그용 JSON 구성 (Ai_Recommand.recommanded_profiles에 저장할 형태)
  const recommandedProfiles = recs.map((r) => ({
    post_id: r.targetId,
    score: r.score,
    jaccard_skill: r.jaccardSkill,
    jaccard_interest: r.jaccardInterest,
    jaccard_role: r.jaccardRole,
    common_skills: r.commonSkills,
  }));

  // 공통 스킬들 모아서 중복 제거
  const recommandedSkills = Array.from(
    new Set(recs.flatMap((r) => r.commonSkills ?? []))
  );

  // 5) Ai_Recommand 테이블에 로그 저장
  //    - 테이블 컬럼: id, user_id, recommanded_skills, recommanded_profiles, created_at
  await supabase.from('Ai_Recommand').insert({
    user_id: userId,
    recommanded_skills: recommandedSkills,
    recommanded_profiles: recommandedProfiles,
    created_at: new Date().toISOString(),
  });

  // 6) 프론트로 내려줄 응답 구조
  return {
    userId,
    count: recs.length,
    recommanded_skills: recommandedSkills,
    recommanded_profiles: recommandedProfiles,
  };
}

// GET /api/ai-recommend?userId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId 쿼리 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    const payload = await buildRecommendations(userId);
    return NextResponse.json(payload, { status: 200 });
  } catch (e: any) {
    console.error('AI recommend GET error:', e);
    return NextResponse.json(
      { error: 'AI 추천 생성 중 오류가 발생했습니다.', detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

// POST /api/ai-recommend  (body 또는 query로 userId 전달 가능)
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      userId?: string;
      // skills, interests 등은 현재는 사용하지 않지만, 확장을 위해 남겨 둠
      skills?: string;
      interests?: string;
      availability?: string;
      teamSize?: number | string;
      note?: string;
    };

    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get('userId');

    const userId = body.userId ?? queryUserId;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId가 필요합니다. body 또는 쿼리 파라미터로 전달하세요.' },
        { status: 400 }
      );
    }

    const payload = await buildRecommendations(userId);
    return NextResponse.json(payload, { status: 200 });
  } catch (e: any) {
    console.error('AI recommend POST error:', e);
    return NextResponse.json(
      { error: 'AI 추천 생성 중 오류가 발생했습니다.', detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}