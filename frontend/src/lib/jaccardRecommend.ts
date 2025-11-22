// src/lib/jaccardRecommend.ts
// Jaccard 유사도 + 추천 로직 (순수 함수만)

export type Profile = {
  id: string;
  skill_tags: string[] | null;
  interest_tags: string[] | null;
  role_tags: string[] | null;
};

export type RecommendResult = {
  targetId: string;
  score: number;
  jaccardSkill: number;
  jaccardInterest: number;
  jaccardRole: number;
  commonSkills: string[];
};

function toSet(arr: unknown): Set<string> {
  let list: string[] = [];

  if (Array.isArray(arr)) {
    list = arr.map((v) => String(v));
  } else if (typeof arr === 'string') {
    // 문자열인 경우: JSON 배열 문자열이거나, 그냥 "a,b,c" 형태일 수 있음
    try {
      const parsed = JSON.parse(arr);
      if (Array.isArray(parsed)) {
        list = parsed.map((v) => String(v));
      } else {
        list = arr.split(',').map((v) => v.trim());
      }
    } catch {
      list = arr.split(',').map((v) => v.trim());
    }
  } else if (arr && typeof arr === 'object') {
    // jsonb가 { "React": true, "TS": true } 같은 형태라면 key들을 태그로 사용
    list = Object.keys(arr as Record<string, unknown>);
  }

  return new Set(
    list
      .map((x) => x.trim())
      .filter(Boolean)
  );
}

// Jaccard 유사도: J(A,B) = |A ∩ B| / |A ∪ B|
export function jaccard(a: unknown, b: unknown): number {
  const setA = toSet(a);
  const setB = toSet(b);

  if (setA.size === 0 && setB.size === 0) return 0;

  let intersection = 0;
  for (const x of setA) {
    if (setB.has(x)) intersection++;
  }

  const unionSize = new Set([...setA, ...setB]).size;
  if (unionSize === 0) return 0;
  return intersection / unionSize;
}

// 교집합 스킬 목록
export function intersection(a: unknown, b: unknown): string[] {
  const setA = toSet(a);
  const setB = toSet(b);
  const result: string[] = [];
  for (const x of setA) {
    if (setB.has(x)) result.push(x);
  }
  return result;
}

/**
 * Jaccard 기반 추천
 * - me: 기준이 되는 내 프로필
 * - candidates: 추천 후보 프로필들
 * - k: 상위 몇 명을 추천할지
 */
export function recommendByJaccard(
  me: Profile,
  candidates: Profile[],
  k: number = 20
): RecommendResult[] {
  const results: RecommendResult[] = [];

  for (const c of candidates) {
    if (c.id === me.id) continue;

    const jSkill = jaccard(me.skill_tags, c.skill_tags);
    const jInterest = jaccard(me.interest_tags, c.interest_tags);
    const jRole = jaccard(me.role_tags, c.role_tags);

    // 가중치 (필요하면 조정)
    const score = 0.6 * jSkill + 0.3 * jInterest + 0.1 * jRole;

    if (score <= 0) continue; // 완전 무관하면 스킵

    const commonSkills = intersection(me.skill_tags, c.skill_tags);

    results.push({
      targetId: c.id,
      score,
      jaccardSkill: jSkill,
      jaccardInterest: jInterest,
      jaccardRole: jRole,
      commonSkills,
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, k);
}