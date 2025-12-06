import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getJaccardRecommendationsForUser } from '@/lib/jaccardRecommend';
import { getAnnRecommendationsForUser, type AnnWeights } from '@/lib/annRecommend';

type AiRecommendFilters = {
  skills: string;
  interests: string;
  availability: string;
  teamSize: number | null;
  note: string;
  desiredRole: string;
  collabMode: string;
  experienceLevel: string;
  preferredYearMin: number | null;
  preferredYearMax: number | null;
  priority: 'balanced' | 'skills' | 'time' | 'style';
};

// Supabase 클라이언트 (타입 제너릭/Database 타입 전혀 안 씀)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY)가 설정되어 있지 않습니다.'
  );
}

// 타입 안 붙인 순수 Supabase 클라이언트
const supabase = createClient(supabaseUrl, supabaseKey);

// 간단한 기본 ANN 가중치 (임시 값)
// 실제 서비스에서는 학습된 가중치를 JSON 등으로 불러와서 채워 넣어야 한다.
const ANN_INPUT_SIZE = 9; // ANN_FEATURE_NAMES.length
const ANN_HIDDEN_SIZE = ANN_INPUT_SIZE;

// 기본 ANN 가중치 (휴리스틱):
// - W1: 거의 identity 형태로 feature를 그대로 은닉층으로 전달
// - W2: 은닉층 평균에 기반해 sigmoid 적용
// - b2: 약간 음수로 줘서 평균 feature가 낮을 때는 점수가 낮게 나오도록 조정
const defaultAnnWeights: AnnWeights = {
  inputSize: ANN_INPUT_SIZE,
  hiddenSize: ANN_HIDDEN_SIZE,
  W1: Array.from({ length: ANN_HIDDEN_SIZE }, (_, i) =>
    Array.from({ length: ANN_INPUT_SIZE }, (_, j) => (i === j ? 1 : 0))
  ),
  b1: Array.from({ length: ANN_HIDDEN_SIZE }, () => 0),
  W2: Array.from({ length: ANN_HIDDEN_SIZE }, () => 1 / ANN_HIDDEN_SIZE),
  b2: -0.5,
};

// 공통 처리 함수: userId + filters 받아서 Jaccard + ANN 추천 실행
async function buildRecommendations(userId: string, filters?: AiRecommendFilters) {
  const [jaccardResults, annResults] = await Promise.all([
    getJaccardRecommendationsForUser(supabase, userId, 20, filters),
    getAnnRecommendationsForUser(supabase, userId, defaultAnnWeights, 20, filters),
  ]);

  // 추천 대상 유저들의 이름을 한 번에 조회
  const targetUserIds = Array.from(
    new Set([
      ...jaccardResults.map((r: any) => r.targetUserId),
      ...annResults.map((r: any) => r.targetUserId),
    ])
  );

  const nameMap = new Map<string, string | null>();

  if (targetUserIds.length > 0) {
    // 1) profiles.id 기준으로 먼저 조회 (현재 스키마: id, name, email, department, year, ...)
    const { data: byIdRows, error: byIdError } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', targetUserIds);

    if (!byIdError && byIdRows) {
      for (const row of byIdRows as { id: string; name: string | null }[]) {
        nameMap.set(row.id, row.name ?? null);
      }
    }

    // 2) 혹시 profiles.user_id 컬럼이 추가로 있는 경우를 대비해서 한 번 더 시도
    const { data: byUserIdRows, error: byUserIdError } = await supabase
      .from('profiles')
      .select('user_id, name')
      .in('user_id', targetUserIds);

    if (!byUserIdError && byUserIdRows) {
      for (const row of byUserIdRows as { user_id: string; name: string | null }[]) {
        nameMap.set(row.user_id, row.name ?? null);
      }
    }
  }

  const jaccardWithNames = jaccardResults.map((r: any) => ({
    ...r,
    targetName: nameMap.get(r.targetUserId) ?? null,
  }));

  const annWithNames = annResults.map((r: any) => ({
    ...r,
    targetName: nameMap.get(r.targetUserId) ?? null,
  }));

  return {
    userId,
    filters,
    jaccard: {
      count: jaccardWithNames.length,
      results: jaccardWithNames,
    },
    ann: {
      count: annWithNames.length,
      results: annWithNames,
    },
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

    const payload = await buildRecommendations(userId, undefined);
    return NextResponse.json(payload, { status: 200 });
  } catch (e: any) {
    console.error('AI recommend GET error:', e);
    return NextResponse.json(
      {
        error: 'AI 추천 생성 중 오류가 발생했습니다.',
        detail: String(e?.message ?? e),
      },
      { status: 500 }
    );
  }
}

// POST /api/ai-recommend  (body 또는 query로 userId 전달 가능)
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      userId?: string;
      filters?: AiRecommendFilters;
    };

    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get('userId');

    const userId = body.userId ?? queryUserId;
    const filters = body.filters;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId가 필요합니다. body 또는 쿼리 파라미터로 전달하세요.' },
        { status: 400 }
      );
    }

    const payload = await buildRecommendations(userId, filters);
    return NextResponse.json(payload, { status: 200 });
  } catch (e: any) {
    console.error('AI recommend POST error:', e);
    return NextResponse.json(
      {
        error: 'AI 추천 생성 중 오류가 발생했습니다.',
        detail: String(e?.message ?? e),
      },
      { status: 500 }
    );
  }
}