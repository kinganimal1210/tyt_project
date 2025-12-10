// src/lib/annRecommend.ts
//  posts / profiles / interactions 테이블을 이용해
//   사용자별 후보에 대한 feature 벡터를 만들고
//   간단한 MLP(1 hidden layer)를 통해 점수를 계산한다.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Json, PostRow } from './jaccardRecommend';
import { jaccard } from './jaccardRecommend';

export type AiRecommendFilters = {
  skills: string;               // 희망 기술 / 스택
  interests: string;            // 관심 분야 / 카테고리
  availability: string;         // 가능한 시간대 코드 ('' | 'weekday_evening' | 'weekend' | 'flexible')
  desiredRole: string;          // 원하는 역할 / 포지션 ->현재사용안함
  experienceLevel: string;      // 원하는 팀원 경험 수준 코드 ('' | 'beginner' | 'intermediate' | 'advanced')
  preferredYearMin: number | null; // 선호 학년 최소 (null이면 제한 없음)
  preferredYearMax: number | null; // 선호 학년 최대 (null이면 제한 없음)
};

export interface ProfileRow {
  id: string;
  department: string | null;
  year: number | null;
}

export interface InteractionRow {
  from_user_id: string;
  to_user_id: string;
  action: string;
  created_at: string;
  meta: Json | null;
}

export interface AnnRecommendResult {
  targetUserId: string;
  targetPostId: string;
  annScore: number;        // 0 ~ 1
  features: number[];      // ANN 입력 벡터
  featureNames: string[];  // 각 feature 이름
}

// ANN 구조 정의 

export interface AnnWeights {
  inputSize: number;
  hiddenSize: number;
  // W1
  W1: number[][];
  b1: number[]; // [hiddenSize]
  // W2
  W2: number[];
  b2: number;
}

function dense(vec: number[], W: number[][], b: number[]): number[] {
  const out: number[] = new Array(W.length).fill(0);

  for (let i = 0; i < W.length; i++) {
    let sum = b[i] ?? 0;
    const row = W[i];
    for (let j = 0; j < row.length; j++) {
      sum += row[j] * (vec[j] ?? 0);
    }
    out[i] = sum;
  }
  return out;
}

function relu(v: number[]): number[] {
  return v.map((x) => (x > 0 ? x : 0));
}

function sigmoid(x: number): number {
  if (x < -30) return 0;
  if (x > 30) return 1;
  return 1 / (1 + Math.exp(-x));
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

export const ANN_FEATURE_NAMES: string[] = [
  'jaccard_skills',
  'jaccard_interests',
  'jaccard_available',
  'jaccard_personality',
  'jaccard_experience',
  'same_department',
  'year_similarity',
  'interaction_score',
  'has_past_interaction',
];

// ANN forward
export function annPredictScore(x: number[], weights: AnnWeights): number {
  if (x.length !== weights.inputSize) {
    throw new Error(
      `ANN input size mismatch: expected ${weights.inputSize}, got ${x.length}`
    );
  }
  const hLinear = dense(x, weights.W1, weights.b1);
  const h = relu(hLinear);
  const yLinear = dot(weights.W2, h) + weights.b2;
  return sigmoid(yLinear);
}

// 현재사용안함
interface InteractionStat {
  views: number;
  chats: number;
  teams: number;
}

function buildInteractionStats(
  interactions: InteractionRow[]
): Map<string, InteractionStat> {
  const m = new Map<string, InteractionStat>();

  for (const row of interactions) {
    const key = row.to_user_id;
    let s = m.get(key);
    if (!s) {
      s = { views: 0, chats: 0, teams: 0 };
      m.set(key, s);
    }
    switch (row.action) {
      case 'view':
        s.views++;
        break;
      case 'chat':
        s.chats++;
        break;
      case 'team_join':
        s.teams++;
        break;
      default:
        // 기타 action 은 meta 로만 활용
        break;
    }
  }
  return m;
}

function interactionScore(stat: InteractionStat | undefined): {
  score: number;
  hasInteraction: number;
} {
  if (!stat) return { score: 0, hasInteraction: 0 };

  const raw =
    0.1 * stat.views +
    0.4 * stat.chats +
    0.7 * stat.teams; // 가중치는 상황에 맞게 조정 가능

  const score = Math.max(0, Math.min(1, raw / 10)); // 대략 0~10 범위를 0~1로 노멀라이즈
  const hasInteraction = raw > 0 ? 1 : 0;
  return { score, hasInteraction };
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function buildFeatureVector(params: {
  meProfile: ProfileRow | undefined;
  mePost: PostRow;
  candProfile: ProfileRow | undefined;
  candPost: PostRow;
  candInteraction: InteractionStat | undefined;
  filters?: AiRecommendFilters;
}): number[] {
  const { meProfile, mePost, candProfile, candPost, candInteraction, filters } = params;

 
  //    AIRecommend.tsx에서 입력한 filters 값을 우선적으로 사용
  //    비어 있으면 mePost(내가 올린 피드)의 정보를 fallback 으로 사용
  const querySkills: Json | null =
    filters && filters.skills && filters.skills.trim().length > 0
      ? (filters.skills as Json)
      : mePost.skills;

  const queryInterests: Json | null =
    filters && filters.interests && filters.interests.trim().length > 0
      ? (filters.interests as Json)
      : mePost.interests;

  const queryAvailable: Json | null =
    filters && filters.availability && filters.availability.trim().length > 0
      ? (filters.availability as Json)
      : mePost.available;

  // 협업 스타일 / 성향은 현재 별도 필터 입력 없이
  // 내 포스트(personality)를 기준으로만 사용
  const queryPersonality: Json | null = mePost.personality;

  const queryExperience: Json | null =
    filters && filters.experienceLevel && filters.experienceLevel.trim().length > 0
      ? (filters.experienceLevel as Json)
      : mePost.experience;

  // 2) Jaccard 기반 feature 계산
  //    - "입력 조건 vs 후보 post" 기준으로 유사도 계산
  const jSkillBase = jaccard(querySkills, candPost.skills);
  const jInterestBase = jaccard(queryInterests, candPost.interests);
  const jAvailBase = jaccard(queryAvailable, candPost.available);
  const jPersBase = jaccard(queryPersonality, candPost.personality);
  const jExpBase = jaccard(queryExperience, candPost.experience);

  // 현재는 priority 필터를 사용하지 않고,
  // 각 유사도를 그대로 0~1 범위로 클램핑해서 feature로 사용한다.
  let jSkill = clamp01(jSkillBase);
  let jInterest = clamp01(jInterestBase);
  let jAvail = clamp01(jAvailBase);
  let jPers = clamp01(jPersBase);
  let jExp = clamp01(jExpBase);

  let sameDept = 0;
  if (meProfile?.department && candProfile?.department) {
    sameDept = meProfile.department === candProfile.department ? 1 : 0;
  }

  let yearSim = 0.5; // 정보 없으면 중간값
  if (typeof meProfile?.year === 'number' && typeof candProfile?.year === 'number') {
    const diff = Math.abs(meProfile.year - candProfile.year);
    const norm = Math.min(diff, 4) / 4; // 0~1
    yearSim = 1 - norm; // 차이가 적을수록 1에 가깝게
  }

  // 사용자가 선호 학년 범위를 지정한 경우, 범위 밖인 후보는 yearSim을 약간 감소
  if (candProfile?.year != null) {
    if (
      filters?.preferredYearMin != null &&
      candProfile.year < filters.preferredYearMin
    ) {
      yearSim *= 0.6;
    }
    if (
      filters?.preferredYearMax != null &&
      candProfile.year > filters.preferredYearMax
    ) {
      yearSim *= 0.6;
    }
  }
  yearSim = clamp01(yearSim);

  const inter = interactionScore(candInteraction);
  let interScore = inter.score;
  let hasInteraction = inter.hasInteraction;

  return [
    jSkill,
    jInterest,
    jAvail,
    jPers,
    jExp,
    sameDept,
    yearSim,
    interScore,
    hasInteraction,
  ];
}

//  ANN 기반 추천 생성

export async function getAnnRecommendationsForUser(
  supabase: SupabaseClient<any>,
  userId: string,
  weights: AnnWeights,
  limit: number = 20,
  filters?: AiRecommendFilters
): Promise<AnnRecommendResult[]> {
  // 1) profiles 로드
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, department, year');
  if (profilesError) throw profilesError;

  const profiles = (profilesData ?? []) as ProfileRow[];

  // 2) posts 로드
  const { data: postsData, error: postsError } = await supabase
    .from('posts')
    .select('*');
  if (postsError) throw postsError;

  const posts = (postsData ?? []) as PostRow[];
  if (!posts.length) return [];

  // user_id -> 대표 post (가장 먼저 나온 것) 매핑
  const postByUser = new Map<string, PostRow>();
  for (const p of posts) {
    if (!postByUser.has(p.user_id)) {
      postByUser.set(p.user_id, p);
    }
  }

  const meProfile = profiles.find((p) => p.id === userId);
  const mePost = postByUser.get(userId);
  if (!mePost) {
    // 내 포스트가 없으면 추천 불가
    return [];
  }

  // 3) interactions 
  const { data: interData, error: interError } = await supabase
    .from('interactions') 
    .select('from_user_id, to_user_id, action, created_at, meta')
    .eq('from_user_id', userId);
  if (interError) throw interError;

  const interactions = (interData ?? []) as InteractionRow[];
  const interStats = buildInteractionStats(interactions);

  // 4) ANN 점수 계산
  const results: AnnRecommendResult[] = [];

  for (const candProfile of profiles) {
    if (candProfile.id === userId) continue;

    const candPost = postByUser.get(candProfile.id);
    if (!candPost) continue; // 포스트 없는 유저는 스킵

    const stats = interStats.get(candProfile.id);

    const features = buildFeatureVector({
      meProfile,
      mePost,
      candProfile,
      candPost,
      candInteraction: stats,
      filters,
    });

    const score = annPredictScore(features, weights);

    results.push({
      targetUserId: candProfile.id,
      targetPostId: candPost.id,
      annScore: score,
      features,
      featureNames: ANN_FEATURE_NAMES,
    });
  }

  // 5) 점수 기준 내림차순 정렬 후 상위 N개
  results.sort((a, b) => b.annScore - a.annScore);
  return results.slice(0, limit);
}
