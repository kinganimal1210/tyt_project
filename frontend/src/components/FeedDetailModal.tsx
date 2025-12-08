// src/components/FeedDetailModal.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Pencil, Trash2 } from 'lucide-react';

// posts.interests JSON 타입
type Interest = {
  category?: string; // 'club' | 'contest' | ...
  position?: string; // 'frontend' | 'backend' | 'fullstack' ...
};

// FeedList와 맞춘 타입(대부분 optional)
interface Profile {
  id: string;
  title?: string;
  description?: string;

  // 과거 단일 컬럼
  category?: string;
  position?: any;

  // JSONB
  interests?: Interest | Interest[];

  experience?: any;
  available?: any;
  personality?: any;
  contact?: string;
  skills?: string[];
  projects?: string[];
  createdAt?: string;
  created_at?: string;
  author?: {
    id?: string;
    name?: string;
    department?: string;
    year?: number;
  };
}

interface FeedDetailModalProps {
  profile: Profile;
  onClose: () => void;
  onEdit: (profile: Profile) => void;
  onDelete: () => void;
  onChatStart: () => void;
  isOwner: boolean;
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

const availabilityLabels: Record<string, string> = {
  weekday_evening: '주중 저녁 위주',
  weekend: '주말 위주',
  flexible: '상관없음 / 유동적',
};

const personalityLabels: Record<string, string> = {
  quiet_steady: '차분하지만 꾸준한 스타일',
  proactive_leader: '적극적으로 리딩하는 스타일',
  humorous: '유머러스하고 분위기 메이커',
  detail_oriented: '꼼꼼하고 디테일을 중시',
};

// string / 객체 뭐가 와도 사람이 읽을 수 있는 라벨로 바꿔주는 함수
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

// ✅ interests / category 에서 categoryKey 뽑기
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

// ✅ interests / position / profile.position 에서 positionKey 뽑기
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

export default function FeedDetailModal({
  profile,
  onClose,
  onEdit,
  onDelete,
  onChatStart,
  isOwner,
}: FeedDetailModalProps) {
  const author = profile.author ?? {
    name: '이름 없음',
    department: '',
    year: 0,
  };

  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  const projects = Array.isArray(profile.projects) ? profile.projects : [];

  const createdAtRaw =
    profile.createdAt ?? profile.created_at ?? new Date().toISOString();
  const createdAtLabel = new Date(createdAtRaw).toLocaleString();

  const categoryKey = getCategoryKey(profile);
  const categoryLabel = categoryLabels[categoryKey] ?? '기타';

  const positionKey = getPositionKey(profile);
  const positionLabel = positionKey
    ? positionLabels[positionKey] ?? positionKey
    : '미지정';

  const experienceLabel = normalizeEnum(
    profile.experience,
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
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        {/* 헤더 */}
        <DialogHeader className="px-6 pt-4 pb-2 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {(author.name ?? 'U').charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="flex items-center gap-2">
                {profile.title ?? '제목 없음'}
                <Badge variant="outline" className="text-xs">
                  {categoryLabel}
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {author.name} • {author.department}{' '}
                {author.year ? `${author.year}학년` : ''}
              </p>
            </div>
          </div>

          {/* 오른쪽 아이콘들: 닫기 X와 좀 떨어지도록 mr-8 추가 */}
          <div className="flex items-center gap-2 mr-8">
            {isOwner && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    onClose();
                    onEdit(profile);
                  }}
                  className="h-8 w-8"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onDelete}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </DialogHeader>

        {/* 내용 영역 */}
        <ScrollArea className="max-h-[80vh] px-6 py-4">
          {/* 기본 정보 */}
          <section className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold">포지션</span>
              <Badge variant="secondary" className="text-xs">
                {positionLabel}
              </Badge>
              <span className="font-semibold ml-3">경험</span>
              <Badge variant="outline" className="text-xs">
                {experienceLabel}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
              <span className="font-semibold">시간대</span>
              <Badge variant="outline" className="text-xs">
                {availabilityLabel}
              </Badge>
              <span className="font-semibold ml-3">협업 스타일</span>
              <Badge variant="outline" className="text-xs">
                {personalityLabel}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {profile.description ?? '소개글이 없습니다.'}
            </p>
          </section>

          <Separator className="my-4" />

          {/* Skills */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">기술 스택</h3>
            {skills.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                등록된 기술 스택이 없습니다.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </section>

          {/* Projects */}
          {projects.length > 0 && (
            <section className="space-y-3 mt-4">
              <h3 className="text-sm font-semibold">관련 프로젝트</h3>
              <div className="flex flex-wrap gap-2">
                {projects.map((project) => (
                  <Badge key={project} variant="outline" className="text-xs">
                    {project}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Contact */}
          {profile.contact && (
            <section className="space-y-2 mt-4">
              <h3 className="text-sm font-semibold">연락 가능 수단</h3>
              <p className="text-sm text-muted-foreground">
                {profile.contact}
              </p>
            </section>
          )}

          <Separator className="my-4" />

          <p className="text-xs text-muted-foreground">
            {createdAtLabel}에 작성됨
          </p>
        </ScrollArea>

        {/* 채팅하기 버튼 - 내 피드일 때는 숨김 */}
        {!isOwner && (
          <div className="w-full flex justify-end px-6 pb-4">
            <Button
              size="sm"
              onClick={() => {
                onChatStart();
                onClose();
              }}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
            >
              <MessageCircle className="h-4 w-4" />
              채팅하기
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
