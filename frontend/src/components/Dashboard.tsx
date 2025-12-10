'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FeedList from '@/components/FeedList';
import { Badge } from '@/components/ui/badge';

interface Profile {
  id: string;
  title: string;
  description: string;
  category: string;
  interests?: { category?: string; [key: string]: any };
  position: string;
  experience: string;
  contact: string;
  skills: string[];
  projects: string[];
  createdAt: string;
  author: {
    name: string;
    department: string;
    year: number;
  };
}

interface DashboardProps {
  profiles: Profile[];
  onChatStart: (profile: Profile) => void;
  onFeedClick: (profile: Profile) => void;
}

// Mock 데이터
const mockProfiles: Profile[] = [
  {
    id: '1',
    title: 'React 프론트엔드 개발자 구합니다',
    description: '웹 개발 프로젝트를 함께 진행할 React 개발자를 찾고 있습니다. TypeScript 경험이 있으면 더욱 좋습니다.',
    category: 'project',
    position: 'frontend',
    experience: 'intermediate',
    contact: 'kakao: devloper123',
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js'],
    projects: ['쇼핑몰 프로젝트', '블로그 시스템'],
    createdAt: new Date().toISOString(),
    author: {
      name: '김개발',
      department: '컴퓨터공학과',
      year: 3
    }
  },
  {
    id: '2',
    title: 'AI 모델 개발 팀원 모집',
    description: '머신러닝을 활용한 추천 시스템 개발 프로젝트입니다. Python과 TensorFlow 경험이 필요합니다.',
    category: 'capstone',
    position: 'ai',
    experience: 'advanced',
    contact: 'discord: aimaster#1234',
    skills: ['Python', 'TensorFlow', 'PyTorch', 'Pandas'],
    projects: ['이미지 분류 모델', '자연어 처리 프로젝트'],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    author: {
      name: '박머신',
      department: '인공지능학과',
      year: 4
    }
  },
  {
    id: '3',
    title: '모바일 앱 개발자 찾습니다',
    description: 'Flutter를 사용한 크로스플랫폼 앱 개발 프로젝트에 참여할 개발자를 모집합니다.',
    category: 'contest',
    position: 'mobile',
    experience: 'beginner',
    contact: 'email: mobile@example.com',
    skills: ['Flutter', 'Dart', 'Firebase'],
    projects: ['날씨 앱', '할일 관리 앱'],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    author: {
      name: '이모바일',
      department: '소프트웨어학과',
      year: 2
    }
  },
  {
    id: '4',
    title: 'UX/UI 디자이너 모집',
    description: '스타트업 동아리에서 함께 활동할 디자이너를 찾고 있습니다. Figma 사용 가능하신 분 환영합니다.',
    category: 'club',
    position: 'design',
    experience: 'intermediate',
    contact: 'instagram: @designer_kim',
    skills: ['Figma', 'Adobe XD', 'Photoshop', 'Illustrator'],
    projects: ['모바일 앱 디자인', '웹사이트 리디자인'],
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    author: {
      name: '최디자인',
      department: '디자인학과',
      year: 3
    }
  },
  {
    id: '5',
    title: '백엔드 개발자 구인',
    description: 'Node.js와 MongoDB를 사용한 API 서버 개발 경험이 있는 개발자를 찾습니다.',
    category: 'project',
    position: 'backend',
    experience: 'intermediate',
    contact: 'kakao: backend_dev',
    skills: ['Node.js', 'Express', 'MongoDB', 'AWS'],
    projects: ['REST API 서버', '마이크로서비스 아키텍처'],
    createdAt: new Date(Date.now() - 345600000).toISOString(),
    author: {
      name: '정백엔드',
      department: '컴퓨터공학과',
      year: 4
    }
  },
  {
    id: '6',
    title: '기획자 및 PM 역할 담당자 모집',
    description: '프로젝트 전체를 기획하고 관리할 수 있는 분을 찾고 있습니다. 커뮤니케이션 능력이 중요합니다.',
    category: 'capstone',
    position: 'pm',
    experience: 'beginner',
    contact: 'email: pm.leader@gmail.com',
    skills: ['Notion', 'Jira', 'Slack', 'Figma'],
    projects: ['스타트업 인턴', '동아리 운영'],
    createdAt: new Date(Date.now() - 432000000).toISOString(),
    author: {
      name: '한기획',
      department: '경영학과',
      year: 2
    }
  }
];

const categoryLabels = {
  all: '전체',
  club: '동아리',
  capstone: '캡스톤',
  contest: '공모전',
  project: '프로젝트'
};

export default function Dashboard({ profiles = mockProfiles, onChatStart, onFeedClick }: DashboardProps) {
  const [activeCategory, setActiveCategory] = useState('all');

  const getCategoryCount = (category: string) => {
    if (category === 'all') return profiles.length;
    return profiles.filter((p) => {
      const profileCategory = p.category ?? (p as any).interests?.category;
      return profileCategory === category;
    }).length;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-medium mb-2">팀원 모집</h2>
        <p className="text-muted-foreground">
          다양한 프로젝트에 참여할 팀원들을 찾아보세요
        </p>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          {Object.entries(categoryLabels).map(([key, label]) => (
            <TabsTrigger 
              key={key} 
              value={key} 
              className="flex items-center gap-2 data-[state=active]:bg-green-50 data-[state=active]:border-green-200"
              style={{ 
                '--tw-ring-color': 'var(--color-success)',
              } as React.CSSProperties}
            >
              {label}
              <Badge 
                variant="secondary" 
                className="text-xs"
                style={{
                  backgroundColor: activeCategory === key ? 'var(--color-success)' : undefined,
                  color: activeCategory === key ? 'var(--color-success-foreground)' : undefined
                }}
              >
                {getCategoryCount(key)}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.keys(categoryLabels).map((category) => (
          <TabsContent key={category} value={category} className="mt-6">
            <FeedList
              profiles={profiles}
              activeCategory={category}
              onChatStart={onChatStart}
              onFeedClick={onFeedClick}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}