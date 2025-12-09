'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabaseClient';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Sparkles, Filter } from 'lucide-react';
import ChatSystem from '@/components/ChatSystem';

// ---------------- API 타입 정의 ----------------

// Jaccard 기반 추천 결과 (jaccardRecommend.ts의 RecommendResult 구조를 반영)
type ApiJaccardResult = {
  targetId: string;
  targetUserId: string;
  targetPostId: string;
  targetName: string | null;
  score: number;
  jaccardSkill: number;
  jaccardInterest: number;
  jaccardRole: number;
  commonSkills: string[];
};

// ANN 기반 추천 결과 (annRecommend.ts의 AnnRecommendResult 구조를 반영)
type ApiAnnResult = {
  targetUserId: string;
  targetPostId: string;
  targetName: string | null;
  annScore: number;
  features: number[];
  featureNames: string[];
};

type AiRecommendApiResponse = {
  userId: string;
  jaccard: {
    count: number;
    results: ApiJaccardResult[];
  };
  ann: {
    count: number;
    results: ApiAnnResult[];
  };
};

// ---------------- 화면용 타입 정의 ----------------

type ResultItem = {
  id: string;
  title: string;              // fallback 제목 (예: "ANN 추천 #1")
  userName: string | null;    // 실제 추천 대상 이름 (profiles.name)
  skills: string[];
  score: number;
  method: 'jaccard' | 'ann';
  targetUserId: string;
  targetPostId: string;
  // 추가 정보: 포지션, 시간대, 경험 수준 (label 형태)
  positionLabel?: string | null;
  availabilityLabel?: string | null;
  experienceLabel?: string | null;
};


export type AiRecommendFilters = {
  skills: string;               // posts.skills
  interests: string;            // posts.interests
  availability: string;         // posts.available
  desiredRole: string;          // posts.interests.position 등 역할 관련
  experienceLevel: string;      // posts.experience.level
  preferredYearMin: number | null; // profiles.year 최소
  preferredYearMax: number | null; // profiles.year 최대
};

// DB jsonb에서 코드 값을 추출하는 헬퍼들
function getPositionFromInterests(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) {
    // [{ position: 'frontend', ... }, ...] 형태 대비
    const first = raw[0];
    if (first && typeof first === 'object' && 'position' in first) {
      return String(first.position);
    }
  }
  if (typeof raw === 'object') {
    if ('position' in raw) return String((raw as any).position);
  }
  return null;
}

function getAvailabilityCode(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw !== null) {
    if ('value' in raw) return String((raw as any).value);
    if ('type' in raw) return String((raw as any).type);
  }
  return null;
}

function getExperienceCode(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw !== null) {
    if ('value' in raw) return String((raw as any).value);
    if ('level' in raw) return String((raw as any).level);
  }
  return null;
}

// 코드 → 한글 라벨 매핑
const availabilityLabels: Record<string, string> = {
  weekday_evening: '주중(월-금) 저녁 위주',
  weekend: '주말 위주',
  flexible: '상관없음 / 유동적',
};

const experienceLabels: Record<string, string> = {
  beginner: '초급 (1년 미만)',
  intermediate: '중급 (1-3년)',
  advanced: '고급 (3년 이상)',
};

// 포지션 코드 → 한글/표시 라벨 매핑
const positionLabels: Record<string, string> = {
  frontend: '프론트엔드',
  backend: '백엔드',
  fullstack: '풀스택',
  mobile: '모바일',
  ai_ml: 'AI/ML',
  ai: 'AI/ML',
  design: '디자인',
  designer: '디자인',
  pm: '기획/PM',
  planning_pm: '기획/PM',
};

const categoryOptions = [
  { value: 'club', label: '동아리' },
  { value: 'capstone', label: '캡스톤' },
  { value: 'contest', label: '공모전' },
  { value: 'project', label: '프로젝트' },
] as const;

const positionOptions = [
  { value: 'frontend', label: '프론트엔드' },
  { value: 'backend', label: '백엔드' },
  { value: 'fullstack', label: '풀스택' },
  { value: 'mobile', label: '모바일' },
  { value: 'ai_ml', label: 'AI/ML' },
  { value: 'design', label: '디자인' },
  { value: 'pm', label: '기획/PM' },
] as const;

export default function AIRecommend() {
  // Supabase에서 실제 로그인 유저 정보를 불러와 사용하는 state
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);

  // 채팅 모달 상태
  const [chatTarget, setChatTarget] = useState<{ id: string; name: string | null } | null>(null);

  // 마운트 시 현재 로그인 사용자 정보 로딩
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;

      // 실제 Supabase 에러가 있는 경우에만 에러로 로깅
      if (error) {
        console.error('현재 사용자 정보를 가져오지 못했습니다.', error);
        return;
      }

      // 에러는 없지만 user 정보가 없는 경우 (로그인 안 된 상태)
      if (!data?.user) {
        console.warn('현재 로그인된 사용자가 없습니다. AI 추천 기능은 로그인 후 이용 가능합니다.');
        return;
      }

      const user = data.user;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', user.id)
        .single();

      if (cancelled) return;

      setCurrentUser({
        id: user.id,
        name: profile?.name ?? user.email ?? '나',
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 관심 분야: 카테고리 + 포지션을 별도로 입력받고, 내부적으로 합쳐서 사용
  const [category, setCategory] = useState(''); // 카테고리 (예: 캡스톤, 동아리 등)
  const [position, setPosition] = useState(''); // 포지션 (예: 프론트엔드, 백엔드 등)
  const [interests, setInterests] = useState(''); // 백엔드로 넘길 통합 문자열
  const [skills, setSkills] = useState(''); // 원하는 기술 / 스택 (쉼표 구분 문자열)
  const [availability, setAvailability] = useState(''); // 가능 시간 / 요일

  // 추가 조건: 팀원 경험 수준, 선호 학년 범위
  const [desiredRole] = useState(''); // (사용하지 않음, payload 호환용)
  const [experienceLevel, setExperienceLevel] = useState(''); // 팀원 경험 수준
  const [preferredYearMin, setPreferredYearMin] = useState<number | ''>(''); // 선호 학년 최소
  const [preferredYearMax, setPreferredYearMax] = useState<number | ''>(''); // 선호 학년 최대

  // 카테고리 + 포지션 → interests 통합 문자열로 동기화
  useEffect(() => {
    const parts: string[] = [];
    if (category.trim()) parts.push(category.trim());
    if (position.trim()) parts.push(position.trim());
    setInterests(parts.join(', '));
  }, [category, position]);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);

  const router = useRouter();

  const handleChat = (item: ResultItem) => {
    if (!currentUser) return;

    // ChatSystem 모달을 열고, 추천 대상 유저를 initialChat으로 넘김
    setChatTarget({
      id: item.targetUserId,
      name: item.userName ?? '상대방',
    });
  };

  const onRecommend = async () => {
    setLoading(true);
    try {
      if (!currentUser) {
        console.error('현재 사용자 정보가 없습니다. 로그인 상태를 확인하세요.');
        setResults([]);
        return;
      }

      const userId = currentUser.id; // TODO: 실제 로그인 유저 ID로 교체

      // 서버로 넘겨 줄 필터/조건 payload
      const payload = {
        userId,
        filters: {
          skills,
          interests,
          availability,
          desiredRole,
          experienceLevel,
          preferredYearMin: preferredYearMin === '' ? null : preferredYearMin,
          preferredYearMax: preferredYearMax === '' ? null : preferredYearMax,
        },
      } as const;

      // POST /api/ai-recommend
      //  - body.userId: 추천을 요청하는 로그인 사용자 ID
      //  - body.filters: AIRecommend에서 입력한 조건들 (Jaccard/ANN 점수 계산에 실제로 사용됨)
      const res = await fetch('/api/ai-recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error('AI recommend API error:', res.status);
        setResults([]);
        return;
      }

      const data: AiRecommendApiResponse = await res.json();

      // API 응답에 포함된 userId(추천 기준 사용자 ID)를 우선 사용하고,
      // 없으면 fallback 으로 currentUser.id 를 사용한다.
      const effectiveUserId = data.userId || currentUser.id;

      // Jaccard + ANN 결과를 하나의 리스트로 합쳐서 점수 기준으로 정렬
      const mappedJaccard: ResultItem[] = (data.jaccard?.results ?? []).map(
        (p, idx) => ({
          id: p.targetPostId || p.targetId,
          title: `Jaccard 추천 #${idx + 1}`,      // 기본 제목
          userName: p.targetName,                // 실제 이름 (있으면 카드에서 이 값을 우선 표시)
          skills: p.commonSkills ?? [],
          score: p.score,                        // 0~1 점수 (Jaccard 유사도)
          method: 'jaccard',
          targetUserId: p.targetUserId,
          targetPostId: p.targetPostId || p.targetId,
        })
      );

      const mappedAnn: ResultItem[] = (data.ann?.results ?? []).map((p, idx) => ({
        id: p.targetPostId,
        title: `ANN 추천 #${idx + 1}`,   // 기본 제목
        userName: p.targetName,         // 실제 이름
        skills: [],
        score: p.annScore,              // 0~1 점수 (ANN에서 나온 확률값)
        method: 'ann',
        targetUserId: p.targetUserId,
        targetPostId: p.targetPostId,
      }));

      // Jaccard + ANN 결과를 하나의 리스트로 합친 후,
      // 실제 로그인한 사용자(현재 userId / 이름)와 일치하는 카드는 모두 제외
      let combined: ResultItem[] = [...mappedJaccard, ...mappedAnn].filter(
        (item) => {
          const sameId =
            item.targetUserId === effectiveUserId ||
            item.targetUserId === currentUser.id;
          const sameName =
            !!item.userName && item.userName === currentUser.name;
          return !sameId && !sameName;
        }
      );

      // ----- Supabase에서 posts 메타데이터(포지션, 시간대, 경험)를 가져와 라벨 채우기 -----
      const postIds = Array.from(
        new Set(
          combined
            .map((r) => r.targetPostId)
            .filter((id): id is string => typeof id === 'string' && id.length > 0),
        ),
      );

      if (postIds.length > 0) {
        const { data: postRows, error: postsError } = await supabase
          .from('posts')
          .select('id, interests, available, experience')
          .in('id', postIds);

        if (!postsError && postRows) {
          const postMap = new Map<string, any>();
          for (const row of postRows) {
            if (row?.id) postMap.set(row.id, row);
          }

          combined = combined.map((item) => {
            const row = postMap.get(item.targetPostId);
            if (!row) return item;

            const positionCode = getPositionFromInterests(row.interests);
            const availCode = getAvailabilityCode(row.available);
            const expCode = getExperienceCode(row.experience);

            // 포지션: 코드 → 한글/대문자 라벨
            let positionLabel: string | null = null;
            if (positionCode) {
              positionLabel =
                positionLabels[positionCode] ??
                // 매핑에 없으면 코드 자체를 보기 좋게 변환 (대문자)
                positionCode.toUpperCase();
            }

            return {
              ...item,
              positionLabel: positionLabel ?? item.positionLabel ?? null,
              availabilityLabel:
                (availCode && availabilityLabels[availCode]) ??
                item.availabilityLabel ??
                null,
              experienceLabel:
                (expCode && experienceLabels[expCode]) ??
                item.experienceLabel ??
                null,
            };
          });
        } else if (postsError) {
          console.error('추천 대상 posts 정보를 불러오지 못했습니다.', postsError);
        }
      }

      // 점수가 높은 카드가 위로 오도록 정렬
      combined.sort((a, b) => {
        const sa = typeof a.score === 'number' ? a.score : 0;
        const sb = typeof b.score === 'number' ? b.score : 0;
        return sb - sa; // 점수가 높은 카드가 위로 오도록
      });

      setResults(combined);
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 헤더 영역: 아이콘 + 제목 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-500" />
          AI 추천 모드 (베타)
        </h1>
      </div>

      {/* ───────────────── 입력 카드 ───────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            매칭 조건 입력
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 기본 조건: 기술, 카테고리, 포지션, 시간 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 원하는 기술/스택 */}
            <div className="space-y-2">
              <Label htmlFor="skills">원하는 기술/스택</Label>
              <Input
                id="skills"
                placeholder="예: React, Python, Figma"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
            </div>

            {/* 카테고리 */}
            <div className="space-y-2">
              <Label htmlFor="category">카테고리</Label>
              <Select
                value={category}
                onValueChange={setCategory}
              >
                <SelectTrigger id="category" className="w-full">
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 포지션 */}
            <div className="space-y-2">
              <Label htmlFor="position">포지션</Label>
              <Select
                value={position}
                onValueChange={setPosition}
              >
                <SelectTrigger id="position" className="w-full">
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {positionOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 가능 시간/요일 */}
            <div className="space-y-2">
              <Label htmlFor="availability">가능한 시간대</Label>
              <Select
                value={availability}
                onValueChange={setAvailability}
              >
                <SelectTrigger id="availability" className="w-full">
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekday_evening">주중(월-금) 저녁 위주</SelectItem>
                  <SelectItem value="weekend">주말 위주</SelectItem>
                  <SelectItem value="flexible">상관없음 / 유동적</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 원하는 팀원 경험 수준 */}
            <div className="space-y-2">
              <Label htmlFor="experienceLevel">원하는 팀원 경험 수준</Label>
              <Select
                value={experienceLevel}
                onValueChange={setExperienceLevel}
              >
                <SelectTrigger id="experienceLevel" className="w-full">
                  <SelectValue placeholder="상관없음" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">초급 (1년 미만)</SelectItem>
                  <SelectItem value="intermediate">중급 (1-3년)</SelectItem>
                  <SelectItem value="advanced">고급 (3년 이상)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 선호 학년 범위 */}
            <div className="space-y-2">
              <Label>선호 학년 범위</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={4}
                  placeholder="최소"
                  value={preferredYearMin}
                  onChange={(e) =>
                    setPreferredYearMin(
                      e.target.value === '' ? '' : Number(e.target.value)
                    )
                  }
                />
                <span className="text-sm text-muted-foreground">~</span>
                <Input
                  type="number"
                  min={1}
                  max={4}
                  placeholder="최대"
                  value={preferredYearMax}
                  onChange={(e) =>
                    setPreferredYearMax(
                      e.target.value === '' ? '' : Number(e.target.value)
                    )
                  }
                />
              </div>
            </div>
          </div>


          {/* 추천 버튼 */}
          <div className="flex justify-end">
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={onRecommend}
              disabled={loading || !currentUser}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {loading ? '추천 생성 중...' : '추천 받기'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ───────────────── 결과 카드 ───────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>추천 결과</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              아직 결과가 없습니다. 조건을 입력하고 추천을 받아보세요.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                총 <span className="font-medium">{results.length}</span>명 추천되었습니다.
              </p>
              <div className="space-y-3">
                {results.map((r) => {
                  const clamped = Math.min(1, Math.max(0, r.score));
                  const percent = Math.round(clamped * 100);

                  return (
                    <div
                      key={`${r.method}-${r.id}`}
                      className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <h3 className="font-medium">{r.userName ?? r.title}</h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="flex items-center gap-2">
                              <span className="text-xs uppercase">
                                {r.method === 'jaccard' ? 'JACCARD' : 'ANN'}
                              </span>
                              <span>{percent}%</span>
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleChat(r)}
                            >
                              채팅하기
                            </Button>
                          </div>
                        </div>
                      </div>
                      <Separator className="my-2" />

                      {/* 포지션 / 시간대 / 경험 수준 */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {r.positionLabel && (
                          <Badge variant="outline" className="text-xs">
                            포지션: {r.positionLabel}
                          </Badge>
                        )}
                        {r.availabilityLabel && (
                          <Badge variant="outline" className="text-xs">
                            시간대: {r.availabilityLabel}
                          </Badge>
                        )}
                        {r.experienceLabel && (
                          <Badge variant="outline" className="text-xs">
                            경험: {r.experienceLabel}
                          </Badge>
                        )}
                      </div>

                      {/* 공통 스킬 (Jaccard 결과에만 표시) */}
                      {r.method === 'jaccard' && (
                        <div className="flex flex-wrap gap-2">
                          {r.skills.length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              공통 스킬 정보가 없습니다.
                            </span>
                          ) : (
                            r.skills.map((s) => (
                              <Badge key={s} variant="outline" className="text-xs">
                                {s}
                              </Badge>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 채팅 모달 */}
      {chatTarget && currentUser && (
        <ChatSystem
          onClose={() => setChatTarget(null)}
          currentUser={currentUser}
          initialChat={{
            id: chatTarget.id,
            name: chatTarget.name ?? '상대방',
          }}
        />
      )}
    </div>
  );
}