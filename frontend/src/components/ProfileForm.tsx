// 프로필 피드 작성 및 수정 폼 컴포넌트
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface ProfileFormProps {
  onClose: () => void;
  onSubmit: (profile: any) => void;
  initialData?: any;
  isEditing?: boolean;
}

export default function ProfileForm({
  onClose,
  onSubmit,
  initialData,
  isEditing,
}: ProfileFormProps) {
  // --- initialData에서 안전하게 꺼내기 ---
  const initialCategory: string | undefined =
    initialData?.category ??
    (initialData?.interests &&
      !Array.isArray(initialData.interests) &&
      initialData.interests.category);

  const initialPosition: string | undefined =
    initialData?.position ??
    (initialData?.interests &&
      !Array.isArray(initialData.interests) &&
      initialData.interests.position);

  const initialExperience: string | undefined =
    typeof initialData?.experience === 'string'
      ? initialData.experience
      : initialData?.experience?.level;

  const initialAvailable: string | undefined =
    typeof initialData?.available === 'string'
      ? initialData.available
      : initialData?.available?.type;

  const initialPersonality: string | undefined =
    typeof initialData?.personality === 'string'
      ? initialData.personality
      : initialData?.personality?.style;

  // --- 모든 필드를 state로 관리 ---
  const [title, setTitle] = useState<string>(initialData?.title ?? '');
  const [description, setDescription] = useState<string>(
    initialData?.description ?? '',
  );
  const [contact, setContact] = useState<string>(
    initialData?.contact ?? '',
  );

  const [selectedCategory, setSelectedCategory] =
    useState<string | undefined>(initialCategory);
  const [selectedPosition, setSelectedPosition] =
    useState<string | undefined>(initialPosition);
  const [selectedExperience, setSelectedExperience] =
    useState<string | undefined>(initialExperience);

  const [selectedAvailability, setSelectedAvailability] =
    useState<string | undefined>(initialAvailable);
  const [selectedPersonality, setSelectedPersonality] =
    useState<string | undefined>(initialPersonality);

  const [skills, setSkills] = useState<string[]>(initialData?.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [projects, setProjects] = useState<string[]>(
    initialData?.projects || [],
  );
  const [projectInput, setProjectInput] = useState('');

  // initialData가 바뀔 때마다 state를 다시 채워주기
  useEffect(() => {
    setTitle(initialData?.title ?? '');
    setDescription(initialData?.description ?? '');
    setContact(initialData?.contact ?? '');
    setSkills(initialData?.skills || []);
    setProjects(initialData?.projects || []);

    const cat =
      initialData?.category ??
      (initialData?.interests &&
        !Array.isArray(initialData.interests) &&
        initialData.interests.category);
    const pos =
      initialData?.position ??
      (initialData?.interests &&
        !Array.isArray(initialData.interests) &&
        initialData.interests.position);
    const exp =
      typeof initialData?.experience === 'string'
        ? initialData.experience
        : initialData?.experience?.level;

    const avail =
      typeof initialData?.available === 'string'
        ? initialData.available
        : initialData?.available?.type;

    const pers =
      typeof initialData?.personality === 'string'
        ? initialData.personality
        : initialData?.personality?.style;

    setSelectedCategory(cat);
    setSelectedPosition(pos);
    setSelectedExperience(exp);
    setSelectedAvailability(avail);
    setSelectedPersonality(pers);
  }, [initialData]);

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const addProject = () => {
    if (projectInput.trim() && !projects.includes(projectInput.trim())) {
      setProjects([...projects, projectInput.trim()]);
      setProjectInput('');
    }
  };

  const removeProject = (project: string) => {
    setProjects(projects.filter((p) => p !== project));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const profile = {
      title,
      description,
      category: selectedCategory ?? '',
      position: selectedPosition ?? '',
      experience: selectedExperience ?? '',
      available: selectedAvailability ?? '',
      personality: selectedPersonality ?? '',
      contact,
      skills,
      projects,
      created_at: initialData?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      // 로그인 사용자
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        alert('로그인이 필요합니다.');
        return;
      }

      // posts 테이블 upsert
      const { error } = await supabase.from('posts').upsert(
        {
          user_id: user.id,
          title: profile.title,
          description: profile.description,
          skills: profile.skills,
          interests: {
            category: profile.category,
            position: profile.position,
          },
          experience: profile.experience
            ? { level: profile.experience }
            : null,
          available: profile.available
            ? { type: profile.available }
            : null,
          personality: profile.personality
            ? { style: profile.personality }
            : null,
          contact: profile.contact,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        },
        { onConflict: 'user_id' },
      );

      if (error) throw error;

      alert(
        isEditing
          ? '프로필이 성공적으로 수정되었습니다!'
          : '프로필이 성공적으로 등록되었습니다!',
      );
      onSubmit(profile);
      onClose();
    } catch (err: any) {
      console.error(err);
      alert('프로필 저장 중 오류가 발생했습니다: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>
                {isEditing ? '프로필 수정' : '프로필 작성'}
              </CardTitle>
              <CardDescription>
                {isEditing
                  ? '프로필 정보를 수정해주세요'
                  : '팀원을 찾기 위한 프로필을 작성해주세요'}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 카테고리 / 포지션 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">카테고리</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger id="category">
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
                <Select
                  value={selectedPosition}
                  onValueChange={setSelectedPosition}
                >
                  <SelectTrigger id="position">
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

            {/* 제목 */}
            <div className="space-y-2">
              <Label htmlFor="title">제목</Label>
              <Input
                id="title"
                name="title"
                placeholder="예: React 개발자 구합니다"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required={!isEditing}
              />
            </div>

            {/* 자기소개 */}
            <div className="space-y-2">
              <Label htmlFor="description">자기소개</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="자신에 대해 소개해주세요..."
                className="min-h-[100px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required={!isEditing}
              />
            </div>

            {/* 경험 수준 */}
            <div className="space-y-2">
              <Label htmlFor="experience">경험 수준</Label>
              <Select
                value={selectedExperience}
                onValueChange={setSelectedExperience}
              >
                <SelectTrigger id="experience">
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">
                    초급 (1년 미만)
                  </SelectItem>
                  <SelectItem value="intermediate">
                    중급 (1-3년)
                  </SelectItem>
                  <SelectItem value="advanced">
                    고급 (3년 이상)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 가능한 시간대 & 협업 스타일 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 가능한 시간대 */}
              <div className="space-y-2">
                <Label htmlFor="available">가능한 시간대</Label>
                <Select
                  value={selectedAvailability}
                  onValueChange={setSelectedAvailability}
                >
                  <SelectTrigger id="available">
                    <SelectValue placeholder="선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekday_evening">
                      주중(월-금) 저녁 위주
                    </SelectItem>
                    <SelectItem value="weekend">
                      주말 위주
                    </SelectItem>
                    <SelectItem value="flexible">
                      상관없음 / 유동적
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 협업 스타일(성향) */}
              <div className="space-y-2">
                <Label htmlFor="personality">협업 스타일(성향)</Label>
                <Select
                  value={selectedPersonality}
                  onValueChange={setSelectedPersonality}
                >
                  <SelectTrigger id="personality">
                    <SelectValue placeholder="선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiet_steady">
                      차분하지만 꾸준한 스타일
                    </SelectItem>
                    <SelectItem value="proactive_leader">
                      적극적으로 리딩하는 스타일
                    </SelectItem>
                    <SelectItem value="humorous">
                      유머러스하고 분위기 메이커
                    </SelectItem>
                    <SelectItem value="detail_oriented">
                      꼼꼼하고 디테일을 중시
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 보유 기술 */}
            <div className="space-y-2">
              <Label>보유 기술</Label>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="기술을 입력하세요 (예: React, Python)"
                  onKeyPress={(e) =>
                    e.key === 'Enter' &&
                    (e.preventDefault(), addSkill())
                  }
                />
                <Button
                  type="button"
                  onClick={addSkill}
                  variant="outline"
                >
                  추가
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {skills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
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

            {/* 프로젝트 경험 */}
            <div className="space-y-2">
              <Label>프로젝트 경험</Label>
              <div className="flex gap-2">
                <Input
                  value={projectInput}
                  onChange={(e) => setProjectInput(e.target.value)}
                  placeholder="프로젝트명을 입력하세요"
                  onKeyPress={(e) =>
                    e.key === 'Enter' &&
                    (e.preventDefault(), addProject())
                  }
                />
                <Button
                  type="button"
                  onClick={addProject}
                  variant="outline"
                >
                  추가
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {projects.map((project) => (
                  <Badge
                    key={project}
                    variant="outline"
                    className="flex items-center gap-1"
                  >
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

            {/* 연락처 */}
            <div className="space-y-2">
              <Label htmlFor="contact">연락처</Label>
              <Input
                id="contact"
                name="contact"
                placeholder="카카오톡 ID, 디스코드 등"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                required={!isEditing}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isEditing ? '수정 완료' : '프로필 등록'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
