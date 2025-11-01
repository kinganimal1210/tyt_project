'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Search, Filter } from 'lucide-react';

interface Profile {
  id: string;
  title: string;
  description: string;
  category: string;
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
  project: '프로젝트'
};

const positionLabels = {
  frontend: '프론트엔드',
  backend: '백엔드',
  fullstack: '풀스택',
  mobile: '모바일',
  ai: 'AI/ML',
  design: '디자인',
  pm: '기획/PM'
};

const experienceLabels = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급'
};

export default function FeedList({ profiles, activeCategory, onChatStart, onFeedClick }: FeedListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [experienceFilter, setExperienceFilter] = useState('all');

  const filteredProfiles = profiles.filter(profile => {
    const matchesCategory = activeCategory === 'all' || profile.category === activeCategory;
    const matchesSearch = profile.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         profile.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         profile.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesPosition = positionFilter === 'all' || profile.position === positionFilter;
    const matchesExperience = experienceFilter === 'all' || profile.experience === experienceFilter;

    return matchesCategory && matchesSearch && matchesPosition && matchesExperience;
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
                <SelectItem key={key} value={key}>{label}</SelectItem>
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
                <SelectItem key={key} value={key}>{label}</SelectItem>
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProfiles.map((profile) => (
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
                      {profile.author.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{profile.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {profile.author.name} • {profile.author.department} {profile.author.year}학년
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {categoryLabels[profile.category as keyof typeof categoryLabels]}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {profile.description}
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">포지션:</span>
                  <Badge variant="secondary" className="text-xs">
                    {positionLabels[profile.position as keyof typeof positionLabels]}
                  </Badge>
                  <span className="font-medium">경험:</span>
                  <Badge variant="outline" className="text-xs">
                    {experienceLabels[profile.experience as keyof typeof experienceLabels]}
                  </Badge>
                </div>
                
                <div>
                  <div className="text-xs font-medium mb-1">기술 스택:</div>
                  <div className="flex flex-wrap gap-1">
                    {profile.skills.slice(0, 3).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {profile.skills.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{profile.skills.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {profile.projects.length > 0 && (
                  <div>
                    <div className="text-xs font-medium mb-1">프로젝트:</div>
                    <div className="flex flex-wrap gap-1">
                      {profile.projects.slice(0, 2).map((project) => (
                        <Badge key={project} variant="outline" className="text-xs">
                          {project}
                        </Badge>
                      ))}
                      {profile.projects.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{profile.projects.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="pt-2">
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onChatStart(profile);
                  }}
                  className="w-full hover:bg-green-50 transition-colors"
                  style={{ backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                  size="sm"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  연락하기
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground">
                {new Date(profile.createdAt).toLocaleDateString()}에 작성됨
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProfiles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">조건에 맞는 프로필이 없습니다.</p>
        </div>
      )}
    </div>
  );
}