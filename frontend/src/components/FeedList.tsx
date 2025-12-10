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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Search, Filter } from 'lucide-react';

// 런타임에서 undefined가 들어와도 안 터지도록 대부분 optional
interface Profile {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  interests?: { category?: string; [key: string]: any };
  position?: any;      // string 또는 { value, label } 같은 객체까지 허용
  experience?: any;    // string 또는 { value, label }
  available?: any;
  personality?: any;
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
  onChatStart: (profile: Profile) => void;
  onFeedClick: (profile: Profile) => void;
}

const categoryLabels = {
  club: '동아리',
  capstone: '캡스톤',
  contest: '공모전',
  project: '프로젝트',
};

const positionLabels = {
  frontend: '프론트엔드',
  backend: '백엔드',
  fullstack: '풀스택',
  mobile: '모바일',
  ai: 'AI/ML',
  design: '디자인',
  pm: '기획/PM',
};

const experienceLabels = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
};

const availabilityLabels = {
  weekday_evening: '주중 저녁 위주',
  weekend: '주말 위주',
  flexible: '상관없음 / 유동적',
};

const personalityLabels = {
  quiet_steady: '차분하지만 꾸준한 스타일',
  proactive_leader: '적극적으로 리딩하는 스타일',
  humorous: '유머러스하고 분위기 메이커',
  detail_oriented: '꼼꼼하고 디테일을 중시',
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

// 필터용: 코드(frontend, beginner 등)를 뽑는 함수
function getPositionCode(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw !== null && 'value' in raw) {
    return String((raw as any).value);
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

function getAvailabilityCode(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw !== null) {
    if ('value' in raw) return String((raw as any).value);
    if ('type' in raw) return String((raw as any).type);
  }
  return null;
}

function getPersonalityCode(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw !== null) {
    if ('value' in raw) return String((raw as any).value);
    if ('style' in raw) return String((raw as any).style);
  }
  return null;
}

// 카테고리 값 정규화: 한글/영문을 통일된 코드로 변환
function normalizeCategoryCode(raw?: string | null): string {
  if (!raw) return 'all';

  switch (raw) {
    case 'all':
    case '전체':
      return 'all';

    case 'club':
    case '동아리':
      return 'club';

    case 'capstone':
    case '캡스톤':
      return 'capstone';

    case 'contest':
    case '공모전':
      return 'contest';

    case 'project':
    case '프로젝트':
      return 'project';

    default:
      return raw;
  }
}

export default function FeedList({
  profiles,
  activeCategory,
  onChatStart,
  onFeedClick,
}: FeedListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [experienceFilter, setExperienceFilter] = useState('all');

  // 필터 로직
  const filteredProfiles = profiles.filter((profile) => {
    const profileCategory = normalizeCategoryCode(profile.category ?? profile.interests?.category ?? null);
    const activeCat = normalizeCategoryCode(activeCategory);

    const posCode = getPositionCode(
      profile.position ?? profile.interests?.position,
    ) ?? 'all';
    const expCode = getExperienceCode(profile.experience) ?? 'all';

    const matchesCategory =
      activeCat === 'all' || profileCategory === activeCat;

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

            const categoryKey = normalizeCategoryCode(
              profile.category ?? profile.interests?.category ?? null,
            ) as keyof typeof categoryLabels;

            const positionLabel = normalizeEnum(
              profile.position ?? profile.interests?.position,
              positionLabels,
              '미지정',
            );
            const experienceLabel = normalizeEnum(
              getExperienceCode(profile.experience),
              experienceLabels,
              '미지정',
            );

            const availabilityLabel = normalizeEnum(
              getAvailabilityCode(profile.available),
              availabilityLabels,
              '미지정',
            );

            const personalityLabel = normalizeEnum(
              getPersonalityCode(profile.personality),
              personalityLabels,
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

                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium">시간대:</span>
                      <Badge variant="outline" className="text-xs">
                        {availabilityLabel}
                      </Badge>
                      <span className="font-medium">스타일:</span>
                      <Badge variant="outline" className="text-xs">
                        {personalityLabel}
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

                    {/* 프로젝트 */}
                    {projects.length > 0 && (
                      <div>
                        <div className="text-xs font-medium mb-1">
                          프로젝트:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {projects.map((project) => (
                            <Badge
                              key={project}
                              variant="outline"
                              className="text-xs"
                            >
                              {project}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {createdAtLabel}에 작성됨
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {filteredProfiles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">조건에 맞는 프로필이 없습니다.</p>
        </div>
      )}
    </div>
  );
}