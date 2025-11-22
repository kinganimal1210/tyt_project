'use client';

import { useState } from 'react';
// API 타입 정의
type ApiRecommendedProfile = {
  post_id: string;
  score: number;
  jaccard_skill: number;
  jaccard_interest: number;
  jaccard_role: number;
  common_skills: string[];
};

type AiRecommendApiResponse = {
  userId: string;
  count: number;
  recommanded_skills: string[];
  recommanded_profiles: ApiRecommendedProfile[];
};

// 화면용 타입 정의
type ResultItem = {
  id: string;
  title: string;
  skills: string[];
  score: number;
};
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Filter } from 'lucide-react';

export default function AIRecommend() {
  const [skills, setSkills] = useState('');           // 원하는 기술 / 스택 (쉼표 구분 문자열)
  const [interests, setInterests] = useState('');     // 관심 분야
  const [availability, setAvailability] = useState(''); // 가능 시간 / 요일
  const [teamSize, setTeamSize] = useState<number | ''>(''); // 희망 팀 규모
  const [note, setNote] = useState('');               // 기타 메모

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);

  const onRecommend = async () => {
    setLoading(true);
    try {
      const userId = '21a19753-ab5e-4566-875f-14250873476e'; // 실제 로그인 유저 ID로 교체
      const res = await fetch(`/api/ai-recommend?userId=${userId}`);

      if (!res.ok) {
        console.error('AI recommend API error:', res.status);
        setResults([]);
        return;
      }

      const data: AiRecommendApiResponse = await res.json();

      const mapped: ResultItem[] = data.recommanded_profiles.map((p, idx) => ({
        id: p.post_id,
        title: `추천 팀원 #${idx + 1}`,
        skills: p.common_skills ?? [],
        score: p.score,
      }));

      setResults(mapped);
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
            <div className="space-y-3">
              {results.map((r) => (
                <div
                  key={r.id}
                  className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{r.title}</h3>
                    <Badge variant="secondary">
                      {Math.round(r.score * 100)}%
                    </Badge>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex flex-wrap gap-2">
                    {r.skills.map((s) => (
                      <Badge key={s} variant="outline" className="text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}