'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Mail, Phone, Calendar, MapPin, GraduationCap } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  year: number;
}

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

interface UserProfileModalProps {
  user: User;
  profiles: Profile[];
  onClose: () => void;
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

export default function UserProfileModal({ user, profiles, onClose, onFeedClick }: UserProfileModalProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>프로필</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <div className="space-y-6">
            {/* User Info */}
            <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-green-200 text-green-800">
                  <User className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{user.name}</h2>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                  <div className="flex items-center gap-1">
                    <GraduationCap className="h-4 w-4" />
                    {user.department}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {user.year}학년
                  </div>
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* My Profiles */}
            <div>
              <h3 className="text-lg font-semibold mb-4">내가 작성한 프로필 ({profiles.length}개)</h3>
              
              {profiles.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-muted-foreground">아직 작성한 프로필이 없습니다.</p>
                  <p className="text-sm text-muted-foreground mt-2">새 프로필을 작성해보세요!</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {profiles.map((profile) => (
                    <Card 
                      key={profile.id} 
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onFeedClick(profile)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{profile.title}</CardTitle>
                            <CardDescription className="text-xs">
                              {new Date(profile.createdAt).toLocaleDateString()}에 작성
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {categoryLabels[profile.category as keyof typeof categoryLabels]}
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {profile.description}
                        </p>
                        
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="secondary" className="text-xs">
                            {positionLabels[profile.position as keyof typeof positionLabels]}
                          </Badge>
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}