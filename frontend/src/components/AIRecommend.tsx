'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
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
  skills: string;               // posts.skills
  interests: string;            // posts.interests
  availability: string;         // posts.available
  desiredRole: string;          // posts.interests.position 등 역할 관련
  experienceLevel: string;      // posts.experience.level
  preferredYearMin: number | null; // profiles.year 최소
  preferredYearMax: number | null; // profiles.year 최대
};

export default function AIRecommend() {
  // 사용자가 입력하는 조건들
  const [skills, setSkills] = useState(''); // 원하는 기술 / 스택 (쉼표 구분 문자열)
  const [interests, setInterests] = useState(''); // 관심 분야
  const [availability, setAvailability] = useState(''); // 가능 시간 / 요일

  // 추가 조건: 역할/포지션, 팀원 경험 수준, 선호 학년 범위
  const [desiredRole, setDesiredRole] = useState(''); // 원하는 역할/포지션
  const [experienceLevel, setExperienceLevel] = useState(''); // 팀원 경험 수준
  const [preferredYearMin, setPreferredYearMin] = useState<number | ''>(''); // 선호 학년 최소
  const [preferredYearMax, setPreferredYearMax] = useState<number | ''>(''); // 선호 학년 최대

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
          {/* 기본 조건: 기술, 관심 분야, 시간 */}
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
              <Label htmlFor="interests">카테고리 / 포지션</Label>
              <Input
                id="interests"
                placeholder="예: 추천시스템, 교육, 헬스케어"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
              />
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