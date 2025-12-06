'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Filter } from 'lucide-react';

// posts.interests JSON 타입
type Interest = {
  category?: string;   // 'club' | 'contest' | ...
  position?: string;   // 'frontend' | 'backend' | 'fullstack' ...
};

// 런타임에서 undefined가 들어와도 안 터지도록 대부분 optional
interface Profile {
  id: string;
  title?: string;
  description?: string;

  // 옛날 단일 컬럼
  category?: string;
  position?: any;

  // JSONB
  interests?: Interest | Interest[];

  experience?: any;
  contact?: string;
  skills?: string[];
  projects?: string[];
  createdAt?: string;
  created_at?: string; // Supabase 기본 컬럼명 대응
  author?: {
    id?: string;
    name?: string;
    department?: string;
    year?: number;
  };
}

interface FeedListProps {
  profiles: Profile[];
  activeCategory: string;
  onChatStart: (profile: Profile) => void; // 부모에서 여전히 넘기고 있을 수 있어서 타입은 유지
  onFeedClick: (profile: Profile) => void;
}

const categoryLabels: Record<string, string> = {
  club: '동아리',
  capstone: '캡스톤',
  contest: '공모전',
  project: '프로젝트',
};

const positionLabels: Record<string, string> = {
  frontend: '프론트엔드',
  backend: '백엔드',
  fullstack: '풀스택',
  mobile: '모바일',
  ai: 'AI/ML',
  design: '디자인',
  pm: '기획/PM',
};

const experienceLabels: Record<string, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
};

// 공통: 어떤 형태의 값이 와도 사람이 읽을 수 있는 문자열로 바꾸기
function normalizeEnum(
  raw: any,
  labels?: Record<string, string>,
  fallback = '미지정',
): string {
  if (raw === null || raw === undefined) return fallback;

  if (typeof raw === 'string') {
    if (labels && labels[raw as keyof typeof labels]) {
      return labels[raw as keyof typeof labels];
    }
    return raw;
  }

  if (Array.isArray(raw)) {
    const items = raw
      .map((v) => normalizeEnum(v, labels, ''))
      .filter((v) => v);
    return items.length > 0 ? items.join(', ') : fallback;
  }

  if (typeof raw === 'object') {
    if ('label' in raw && typeof (raw as any).label === 'string') {
      return (raw as any).label;
    }
    if ('value' in raw && typeof (raw as any).value === 'string') {
      const v = (raw as any).value;
      if (labels && labels[v as keyof typeof labels]) {
        return labels[v as keyof typeof labels];
      }
      return v;
    }
    const firstStr = Object.values(raw).find(
      (v) => typeof v === 'string',
    ) as string | undefined;
    if (firstStr) return firstStr;
    return JSON.stringify(raw);
  }

  return String(raw);
}

// ✅ categoryKey: interests → category → profile.category 순으로 가져오기
function getCategoryKey(profile: Profile): string {
  const interests = profile.interests;

  if (Array.isArray(interests)) {
    const first = interests[0];
    if (first?.category) return first.category;
  }

  if (interests && !Array.isArray(interests) && typeof interests === 'object') {
    const obj = interests as Interest;
    if (obj.category) return obj.category;
  }

  if (profile.category) return profile.category;

  return 'etc';
}

// ✅ positionKey: interests.position → profile.position(value) 순으로 가져오기
function getPositionKey(profile: Profile): string | null {
  const interests = profile.interests;

  if (Array.isArray(interests)) {
    const first = interests[0];
    if (first?.position) return first.position;
  }

  if (interests && !Array.isArray(interests) && typeof interests === 'object') {
    const obj = interests as Interest;
    if (obj.position) return obj.position;
  }

  const raw = profile.position;
  if (!raw) return null;

  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && 'value' in raw) {
    return String((raw as any).value);
  }

  return null;
}

// 경험 필터용 코드
function getExperienceCode(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw !== null && 'value' in raw) {
    return String((raw as any).value);
  }
  return null;
}

export default function FeedList({
  profiles,
  activeCategory,
  onChatStart, // 현재는 사용 안 하지만 부모 props 위해 유지
  onFeedClick,
}: FeedListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [experienceFilter, setExperienceFilter] = useState('all');

  // onChatStart가 미사용 오류 나지 않도록 더미 사용
  void onChatStart;

  // 필터 로직
  const filteredProfiles = profiles.filter((profile) => {
    const categoryKey = getCategoryKey(profile);
    const posCode = getPositionKey(profile) ?? 'all';
    const expCode = getExperienceCode(profile.experience) ?? 'all';

    const matchesCategory =
      activeCategory === 'all' || categoryKey === activeCategory;

    const title = (profile.title ?? '').toLowerCase();
    const description = (profile.description ?? '').toLowerCase();
    const skillsArray = Array.isArray(profile.skills) ? profile.skills : [];
    const search = (searchTerm ?? '').toLowerCase();

    const matchesSearch =
      !search ||
      title.includes(search) ||
      description.includes(search) ||
      skillsArray.some((skill) =>
        (skill ?? '').toLowerCase().includes(search),
      );

    const matchesPosition =
      positionFilter === 'all' || posCode === positionFilter;

    const matchesExperience =
      experienceFilter === 'all' || expCode === experienceFilter;

    return (
      matchesCategory &&
      matchesSearch &&
      matchesPosition &&
      matchesExperience
    );
  });

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg border space-y-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="제목, 설명, 기술로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Filter className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex gap-4">
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="포지션" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 포지션</SelectItem>
              {Object.entries(positionLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={experienceFilter} onValueChange={setExperienceFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="경험" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 경험</SelectItem>
              {Object.entries(experienceLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      <div className="text-sm text-muted-foreground">
        {filteredProfiles.length}개의 프로필이 있습니다
      </div>

      {/* Profile Cards */}
      <div className="max-h-[640px] overflow-y-auto pr-1">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProfiles.map((profile) => {
            const author = profile.author ?? {
              name: '이름 없음',
              department: '',
              year: 0,
            };

            const skills = Array.isArray(profile.skills) ? profile.skills : [];
            const projects = Array.isArray(profile.projects)
              ? profile.projects
              : [];

            const createdAtRaw =
              profile.createdAt ??
              profile.created_at ??
              new Date().toISOString();
            const createdAtLabel = new Date(createdAtRaw).toLocaleDateString();

            const categoryKey = profile.category as keyof typeof categoryLabels;

            const positionLabel = normalizeEnum(
              profile.position,
              positionLabels,
              '미지정',
            );
            const experienceLabel = normalizeEnum(
              profile.experience,
              experienceLabels,
              '미지정',
            );

            return (
              <Card
                key={profile.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onFeedClick(profile)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {(author.name ?? 'U').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">
                          {profile.title ?? '제목 없음'}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {author.name ?? '이름 없음'} • {author.department ?? ''}{' '}
                          {author.year ? `${author.year}학년` : ''}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {categoryKey && categoryLabels[categoryKey]
                        ? categoryLabels[categoryKey]
                        : '기타'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {profile.description ?? '설명 없음'}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium">포지션:</span>
                      <Badge variant="secondary" className="text-xs">
                        {positionLabel}
                      </Badge>
                      <span className="font-medium">경험:</span>
                      <Badge variant="outline" className="text-xs">
                        {experienceLabel}
                      </Badge>
                    </div>

                    {/* 기술 스택 */}
                    <div>
                      <div className="text-xs font-medium mb-1">기술 스택:</div>
                      <div className="flex flex-wrap gap-1">
                        {skills.slice(0, 3).map((skill) => (
                          <Badge
                            key={skill}
                            variant="secondary"
                            className="text-xs"
                          >
                            {skill}
                          </Badge>
                        ))}
                        {skills.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 작성 날짜 */}
                <div className="text-xs text-muted-foreground">
                  {createdAtLabel}에 작성됨
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProfiles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">조건에 맞는 프로필이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
