'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface ProfileFormProps {
  onClose: () => void;
  onSubmit: (profile: any) => void;
  initialData?: any;
  isEditing?: boolean;
}

export default function ProfileForm({ onClose, onSubmit, initialData, isEditing }: ProfileFormProps) {
  const [skills, setSkills] = useState<string[]>(initialData?.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [projects, setProjects] = useState<string[]>(initialData?.projects || []);
  const [projectInput, setProjectInput] = useState('');

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const addProject = () => {
    if (projectInput.trim() && !projects.includes(projectInput.trim())) {
      setProjects([...projects, projectInput.trim()]);
      setProjectInput('');
    }
  };

  const removeProject = (project: string) => {
    setProjects(projects.filter(p => p !== project));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const profile = {
      id: isEditing ? initialData.id : Date.now().toString(),
      title: formData.get('title'),
      description: formData.get('description'),
      category: formData.get('category'),
      position: formData.get('position'),
      experience: formData.get('experience'),
      contact: formData.get('contact'),
      skills,
      projects,
      createdAt: isEditing ? initialData.createdAt : new Date().toISOString()
    };

    onSubmit(profile);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{isEditing ? '프로필 수정' : '프로필 작성'}</CardTitle>
              <CardDescription>
                {isEditing ? '프로필 정보를 수정해주세요' : '팀원을 찾기 위한 프로필을 작성해주세요'}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">카테고리</Label>
                <Select name="category" required defaultValue={initialData?.category}>
                  <SelectTrigger>
                    <SelectValue placeholder="선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="club">동아리</SelectItem>
                    <SelectItem value="capstone">캡스톤</SelectItem>
                    <SelectItem value="contest">공모전</SelectItem>
                    <SelectItem value="project">프로젝트</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="position">희망 포지션</Label>
                <Select name="position" required defaultValue={initialData?.position}>
                  <SelectTrigger>
                    <SelectValue placeholder="선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frontend">프론트엔드</SelectItem>
                    <SelectItem value="backend">백엔드</SelectItem>
                    <SelectItem value="fullstack">풀스택</SelectItem>
                    <SelectItem value="mobile">모바일</SelectItem>
                    <SelectItem value="ai">AI/ML</SelectItem>
                    <SelectItem value="design">디자인</SelectItem>
                    <SelectItem value="pm">기획/PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">제목</Label>
              <Input
                id="title"
                name="title"
                placeholder="예: React 개발자 구합니다"
                defaultValue={initialData?.title}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">자기소개</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="자신에 대해 소개해주세요..."
                defaultValue={initialData?.description}
                className="min-h-[100px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">경험 수준</Label>
              <Select name="experience" required defaultValue={initialData?.experience}>
                <SelectTrigger>
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">초급 (1년 미만)</SelectItem>
                  <SelectItem value="intermediate">중급 (1-3년)</SelectItem>
                  <SelectItem value="advanced">고급 (3년 이상)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>보유 기술</Label>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="기술을 입력하세요 (예: React, Python)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                />
                <Button type="button" onClick={addSkill} variant="outline">
                  추가
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>프로젝트 경험</Label>
              <div className="flex gap-2">
                <Input
                  value={projectInput}
                  onChange={(e) => setProjectInput(e.target.value)}
                  placeholder="프로젝트명을 입력하세요"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addProject())}
                />
                <Button type="button" onClick={addProject} variant="outline">
                  추가
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {projects.map((project) => (
                  <Badge key={project} variant="outline" className="flex items-center gap-1">
                    {project}
                    <button
                      type="button"
                      onClick={() => removeProject(project)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">연락처</Label>
              <Input
                id="contact"
                name="contact"
                placeholder="카카오톡 ID, 디스코드 등"
                defaultValue={initialData?.contact}
                required
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                className="flex-1 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}
              >
                {isEditing ? '수정 완료' : '프로필 등록'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}