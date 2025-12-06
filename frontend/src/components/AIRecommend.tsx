'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Filter } from 'lucide-react';

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
};

export type AiRecommendFilters = {
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

export default function AIRecommend() {
  // 사용자가 입력하는 조건들
  const [skills, setSkills] = useState(''); // 원하는 기술 / 스택 (쉼표 구분 문자열)
  const [interests, setInterests] = useState(''); // 관심 분야
  const [availability, setAvailability] = useState(''); // 가능 시간 / 요일
  const [teamSize, setTeamSize] = useState<number | ''>(''); // 희망 팀 규모
  const [note, setNote] = useState(''); // 기타 메모

  // 추가 조건: 역할/포지션, 협업 방식, 경험 수준, 선호 학년 범위, 우선순위
  const [desiredRole, setDesiredRole] = useState(''); // 원하는 역할/포지션
  const [collabMode, setCollabMode] = useState(''); // 협업 방식 (online/offline/hybrid)
  const [experienceLevel, setExperienceLevel] = useState(''); // 팀원 경험 수준
  const [preferredYearMin, setPreferredYearMin] = useState<number | ''>(''); // 선호 학년 최소
  const [preferredYearMax, setPreferredYearMax] = useState<number | ''>(''); // 선호 학년 최대
  const [priority, setPriority] = useState<'balanced' | 'skills' | 'time' | 'style'>(
    'balanced'
  ); // 무엇이 더 중요한가?

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);

  const router = useRouter();

  const handleChat = (item: ResultItem) => {
    // 채팅 페이지에서 userId 쿼리 파라미터를 사용해 방을 생성/조회하도록 가정
    router.push(`/chat?userId=${item.targetUserId}`);
  };

  const onRecommend = async () => {
    setLoading(true);
    try {
      const userId = '21a19753-ab5e-4566-875f-14250873476e'; // TODO: 실제 로그인 유저 ID로 교체

      // 서버로 넘겨 줄 필터/조건 payload
      const payload = {
        userId,
        filters: {
          skills,
          interests,
          availability,
          teamSize: teamSize === '' ? null : teamSize,
          note,
          desiredRole,
          collabMode,
          experienceLevel,
          preferredYearMin: preferredYearMin === '' ? null : preferredYearMin,
          preferredYearMax: preferredYearMax === '' ? null : preferredYearMax,
          priority,
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
      // 점수가 높은 순서대로(내림차순) 정렬하여 상단에 노출
      const combined: ResultItem[] = [...mappedJaccard, ...mappedAnn];

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
          {/* 기본 조건: 기술, 관심 분야, 시간, 팀 규모 */}
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

            {/* 관심 분야 */}
            <div className="space-y-2">
              <Label htmlFor="interests">관심 분야</Label>
              <Input
                id="interests"
                placeholder="예: 추천시스템, 교육, 헬스케어"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
              />
            </div>

            {/* 가능 시간/요일 */}
            <div className="space-y-2">
              <Label htmlFor="availability">가능 시간/요일</Label>
              <Input
                id="availability"
                placeholder="예: 화/목 저녁, 주말 낮"
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
              />
            </div>

            {/* 희망 팀 규모 */}
            <div className="space-y-2">
              <Label htmlFor="teamSize">희망 팀 규모</Label>
              <Input
                id="teamSize"
                type="number"
                min={1}
                max={10}
                placeholder="예: 4"
                value={teamSize}
                onChange={(e) =>
                  setTeamSize(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </div>

            {/* 원하는 역할/포지션 */}
            <div className="space-y-2">
              <Label htmlFor="desiredRole">원하는 역할/포지션</Label>
              <Input
                id="desiredRole"
                placeholder="예: 프론트엔드, 백엔드, AI, PM, 디자이너"
                value={desiredRole}
                onChange={(e) => setDesiredRole(e.target.value)}
              />
            </div>

            {/* 선호 협업 방식 */}
            <div className="space-y-2">
              <Label htmlFor="collabMode">선호 협업 방식</Label>
              <select
                id="collabMode"
                className="w-full border border-input bg-background px-3 py-2 rounded-md text-sm"
                value={collabMode}
                onChange={(e) => setCollabMode(e.target.value)}
              >
                <option value="">상관없음</option>
                <option value="online">온라인 위주</option>
                <option value="offline">오프라인 위주</option>
                <option value="hybrid">온라인/오프라인 혼합</option>
              </select>
            </div>

            {/* 원하는 팀원 경험 수준 */}
            <div className="space-y-2">
              <Label htmlFor="experienceLevel">원하는 팀원 경험 수준</Label>
              <select
                id="experienceLevel"
                className="w-full border border-input bg-background px-3 py-2 rounded-md text-sm"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
              >
                <option value="">상관없음</option>
                <option value="beginner">입문자 위주</option>
                <option value="mixed">실력 혼합</option>
                <option value="advanced">경험자 위주</option>
              </select>
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

            {/* 우선순위 선택 */}
            <div className="space-y-2">
              <Label htmlFor="priority">무엇이 더 중요한가요?</Label>
              <select
                id="priority"
                className="w-full border border-input bg-background px-3 py-2 rounded-md text-sm"
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as 'balanced' | 'skills' | 'time' | 'style')
                }
              >
                <option value="balanced">균형적으로</option>
                <option value="skills">기술/역할이 가장 중요</option>
                <option value="time">시간/일정이 가장 중요</option>
                <option value="style">성향/분위기가 가장 중요</option>
              </select>
            </div>
          </div>

          {/* 기타 메모 (선택 입력) */}
          <div className="space-y-2">
            <Label htmlFor="note">기타 메모 (선택)</Label>
            <Textarea
              id="note"
              rows={3}
              placeholder="선호하는 협업 방식, 도구, 일정 제약 등"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* 추천 버튼 */}
          <div className="flex justify-end">
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={onRecommend}
              disabled={loading}
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
                      key={r.id}
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
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}