'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MessageCircle, Edit, Trash2, Calendar, User, Mail, Phone } from 'lucide-react';

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

interface FeedDetailModalProps {
  profile: Profile;
  onClose: () => void;
  onEdit: (profile: Profile) => void;
  onDelete: (profileId: string) => void;
  onChatStart: (profile: Profile) => void;
  isOwner: boolean;
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

export default function FeedDetailModal({ profile, onClose, onEdit, onDelete, onChatStart, isOwner }: FeedDetailModalProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>프로필 상세보기</DialogTitle>
            <div className="flex items-center gap-2">
              {isOwner && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(profile)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    수정
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        삭제
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>프로필 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                          정말로 이 프로필을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(profile.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          삭제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-green-100 text-green-700">
                  {profile.author.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{profile.title}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <User className="h-4 w-4" />
                  {profile.author.name} • {profile.author.department} {profile.author.year}학년
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(profile.createdAt).toLocaleDateString()}에 작성됨
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline">
                    {categoryLabels[profile.category as keyof typeof categoryLabels]}
                  </Badge>
                  <Badge variant="secondary">
                    {positionLabels[profile.position as keyof typeof positionLabels]}
                  </Badge>
                  <Badge variant="outline">
                    {experienceLabels[profile.experience as keyof typeof experienceLabels]}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">프로젝트 설명</h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {profile.description}
              </p>
            </div>

            {/* Skills */}
            {profile.skills.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">기술 스택</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            {profile.projects.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">관련 프로젝트</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.projects.map((project) => (
                    <Badge key={project} variant="outline" className="text-sm">
                      {project}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Contact */}
            <div>
              <h3 className="font-semibold mb-3">연락처</h3>
              <div className="flex items-center gap-2 text-sm">
                {profile.contact.includes('@') ? (
                  <>
                    <Mail className="h-4 w-4" />
                    <a 
                      href={`mailto:${profile.contact}`}
                      className="text-green-600 hover:text-green-700 hover:underline"
                    >
                      {profile.contact}
                    </a>
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4" />
                    <a 
                      href={`tel:${profile.contact}`}
                      className="text-green-600 hover:text-green-700 hover:underline"
                    >
                      {profile.contact}
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Chat Button */}
            {!isOwner && (
              <div className="pt-4">
                <Button 
                  onClick={() => onChatStart(profile)}
                  className="w-full hover:bg-green-50 transition-colors"
                  style={{ backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {profile.author.name}님과 채팅하기
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}