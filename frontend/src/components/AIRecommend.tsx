'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Filter } from 'lucide-react';

/**
 * 네비게이션 바는 그대로 유지하고,
 * 상위에서 조건부 렌더링으로 본문만 전환해 사용하기 위한 AI 추천 모드 컴포넌트입니다.
 *
 * 사용 예:
 *   {viewMode === 'ai' && <AIRecommend />}
 */
export default function AIRecommend() {
  // 입력 상태
  const [skills, setSkills] = useState('');
  const [interests, setInterests] = useState('');
  const [availability, setAvailability] = useState('');
  const [teamSize, setTeamSize] = useState<number | ''>('');
  const [note, setNote] = useState('');

  // 결과/로딩 상태
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<
    { id: string; title: string; skills: string[]; score: number }[]
  >([]);

  // 추천 트리거 (추후 서버 액션/Route Handler로 교체)
  const onRecommend = async () => {
    setLoading(true);

    // TODO: 실제 구현 시 여기를 서버 액션 또는 /api/ai-recommend 로 대체
    setTimeout(() => {
      // 더미 결과
      setResults([
        { id: 'p1', title: 'FE 개발자(React/TS) 구함', skills: ['React', 'TypeScript', 'Tailwind'], score: 0.92 },
        { id: 'p2', title: 'AI/백엔드 협업 팀', skills: ['Python', 'FastAPI', 'PostgreSQL'], score: 0.87 },
      ]);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-500" />
          AI 추천 모드 (베타)
        </h1>
      </div>

      {/* 입력 카드 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            매칭 조건 입력
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="skills">원하는 기술/스택</Label>
              <Input
                id="skills"
                placeholder="예: React, Python, Figma"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interests">관심 분야</Label>
              <Input
                id="interests"
                placeholder="예: 추천시스템, 교육, 헬스케어"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="availability">가능 시간/요일</Label>
              <Input
                id="availability"
                placeholder="예: 화/목 저녁, 주말 낮"
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamSize">희망 팀 규모</Label>
              <Input
                id="teamSize"
                type="number"
                min={1}
                max={10}
                placeholder="예: 4"
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
          </div>

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

      {/* 결과 카드 */}
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
                    <Badge variant="secondary">{Math.round(r.score * 100)}%</Badge>
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