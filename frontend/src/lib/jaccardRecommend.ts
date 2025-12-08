// src/lib/jaccardRecommend.ts

import type { SupabaseClient } from '@supabase/supabase-js';

export type AiRecommendFilters = {
  skills: string;               // 희망 기술 / 스택
  interests: string;            // 관심 분야 / 카테고리
  availability: string;         // 가능한 시간대 코드 ('' | 'weekday_evening' | 'weekend' | 'flexible')
  desiredRole: string;          // 원하는 역할 / 포지션 (현재 Jaccard에서는 직접 사용 X, ANN 등에서 활용 가능)
  experienceLevel: string;      // 원하는 팀원 경험 수준 코드 ('' | 'beginner' | 'intermediate' | 'advanced')
  preferredYearMin: number | null; // 선호 학년 최소 (null이면 제한 없음)
  preferredYearMax: number | null; // 선호 학년 최대 (null이면 제한 없음)
};

// ---- 타입 정의 ----

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export interface PostRow {
  id: string;
  user_id: string;
  skills: Json | null;
  interests: Json | null;
  available: Json | null;
  personality: Json | null;
  experience: Json | null;
}

export type RecommendResult = {
  postId: string;          // posts.id
  userId: string;          // posts.user_id (작성자)
  score: number;

  // 세부 점수
  skillScore: number;
  interestScore: number;
  availableScore: number;
  personalityScore: number;
  experienceScore: number;

  commonSkills: string[];
  commonInterests: string[];

  // API(route.ts)에서 사용하기 위한 필드 (동일 정보 재노출)
  targetUserId: string;    // == userId
  targetPostId: string;    // == postId
};

// ---- 유틸: jsonb → Set<string> ----

function toTagSet(src: Json | null): Set<string> {
  if (src === null || src === undefined) return new Set();

  let list: string[] = [];

  if (Array.isArray(src)) {
    // ["React", "TS"]
    list = src.map((v) => String(v));
  } else if (typeof src === 'string') {
    // '["React","TS"]' 또는 'React,TS'
    const str = src.trim();
    if (!str) return new Set();

    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        list = parsed.map((v) => String(v));
      } else {
        list = str.split(',').map((v) => v.trim());
      }
    } catch {
      list = str.split(',').map((v) => v.trim());
    }
  } else if (typeof src === 'object') {
    // {"React": true, "TS": true} 같은 jsonb
    list = Object.keys(src as Record<string, Json>);
  }

  return new Set(
    list
      .map((x) => x.trim())
      .filter(Boolean)
  );
}

function intersectionSet(a: Json | null, b: Json | null): string[] {
  const A = toTagSet(a);
  const B = toTagSet(b);
  const result: string[] = [];

  for (const x of A) {
    if (B.has(x)) result.push(x);
  }
  return result;
}

// ---- Jaccard 유사도 ----

export function jaccard(a: Json | null, b: Json | null): number {
  const setA = toTagSet(a);
  const setB = toTagSet(b);

  if (setA.size === 0 && setB.size === 0) return 0;

  let inter = 0;
  for (const x of setA) {
    if (setB.has(x)) inter++;
  }

  const unionSize = new Set([...setA, ...setB]).size;
  if (unionSize === 0) return 0;

  return inter / unionSize; // 0 ~ 1
}

// ---- 포스트 배열에서 Jaccard 기반 추천 ----

export function recommendByJaccardFromPosts(
  mePost: PostRow,
  candidates: PostRow[],
  k: number = 20,
  filters?: AiRecommendFilters
): RecommendResult[] {
  const results: RecommendResult[] = [];

  // priority 관련 가중치 로직 제거

  // 사용자가 AI 추천 모드에서 입력한 조건을 우선적으로 사용하고,
  // 비어 있으면 mePost(내가 올린 글)의 정보를 fallback으로 사용한다.
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

  const queryPersonality: Json | null = mePost.personality;

  const queryExperience: Json | null =
    filters && filters.experienceLevel && filters.experienceLevel.trim().length > 0
      ? (filters.experienceLevel as Json)
      : mePost.experience;

  for (const p of candidates) {
    if (p.id === mePost.id) continue;

    const skillScore = jaccard(querySkills, p.skills);
    const interestScore = jaccard(queryInterests, p.interests);
    const availableScore = jaccard(queryAvailable, p.available);
    const personalityScore = jaccard(queryPersonality, p.personality);
    const experienceScore = jaccard(queryExperience, p.experience);

    // 단순 고정 가중치로 변경
    const score =
      0.4 * skillScore +
      0.3 * interestScore +
      0.1 * availableScore +
      0.1 * personalityScore +
      0.1 * experienceScore;

    if (score <= 0) continue;

    const commonSkills = intersectionSet(querySkills, p.skills);
    const commonInterests = intersectionSet(queryInterests, p.interests);

    results.push({
      postId: p.id,
      userId: p.user_id,
      score,
      skillScore,
      interestScore,
      availableScore,
      personalityScore,
      experienceScore,
      commonSkills,
      commonInterests,
      // API에서 사용할 alias 필드
      targetUserId: p.user_id,
      targetPostId: p.id,
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, k);
}

// ---- Supabase에서 DB 읽어서 추천 계산 ----

export async function getJaccardRecommendationsForUser(
  supabase: SupabaseClient<any>,
  userId: string,
  limit: number = 20,
  filters?: AiRecommendFilters
): Promise<RecommendResult[]> {
  // 1. posts 전체 로드 (필요하면 where 조건 추가)
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const posts = data as PostRow[];

  // 2. 내 포스트(기준 포스트) 찾기
  const mePost = posts.find((p) => p.user_id === userId);
  if (!mePost) return [];

  const candidates = posts.filter((p) => p.id !== mePost.id);

  // 3. Jaccard 기반 점수 계산
  return recommendByJaccardFromPosts(mePost, candidates, limit, filters);
}