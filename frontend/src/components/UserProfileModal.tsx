// 본인 프로필 모달 컴포넌트
// - 네비게이션의 "프로필" 버튼에서 열리는 모달
// - 상단에는 로그인한 사용자의 기본 정보, 하단에는 사용자가 작성한 프로필 목록을 표시
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User as UserIcon, Mail, Phone, Calendar, MapPin, GraduationCap, Pencil, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// ─────────────────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────────────────
// Supabase profiles 테이블과 1:1로 매핑되는 사용자 기본 정보 타입
interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  year: number;
}

// 피드(팀원 모집 글) / 프로필 카드에서 사용하는 데이터 구조
// profiles_detail 테이블의 한 행 + 작성자 정보(author)를 포함
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

// UserProfileModal 컴포넌트에 전달되는 props 정의
// - user: 현재 로그인한 사용자 정보
// - profiles: (초기 렌더 시) 부모에서 내려준 프로필 목록
// - onClose: 모달 닫기 콜백
// - onFeedClick: 프로필 카드를 클릭했을 때 호출 (상세 보기 등으로 이동)
// - onUpdateUser: 사용자 정보가 수정되었을 때 부모 상태를 동기화하기 위한 옵션 콜백
interface UserProfileModalProps {
  user: User;
  profiles: Profile[];
  onClose: () => void;
  onFeedClick: (profile: Profile) => void;
  onUpdateUser?: (updated: User) => void; // 사용자 정보 수정 콜백 (옵션)
}

// 카테고리 코드 → 한글 라벨 매핑
const categoryLabels = {
  club: '동아리',
  capstone: '캡스톤',
  contest: '공모전',
  project: '프로젝트'
};

// 포지션 코드 → 한글 라벨 매핑
const positionLabels = {
  frontend: '프론트엔드',
  backend: '백엔드',
  fullstack: '풀스택',
  mobile: '모바일',
  ai: 'AI/ML',
  design: '디자인',
  pm: '기획/PM'
};

// 경험 수준 코드 → 한글 라벨 매핑
const experienceLabels = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급'
};

export default function UserProfileModal({ user, profiles, onClose, onFeedClick, onUpdateUser }: UserProfileModalProps) {
  // 모달 내에서 보여 줄 사용자 정보 (실제 표시용)
  // - 부모에서 내려주는 user props 를 그대로 쓰지 않고
  //   DB에서 최신값을 다시 읽어 온 뒤 displayUser 에 저장해서 사용
  const [displayUser, setDisplayUser] = useState<User>(user);

  // 부모 컴포넌트에서 user props 가 바뀔 때마다
  // displayUser 상태도 함께 최신 값으로 맞춰준다.
  // (예: 상위에서 onUpdateUser 를 통해 user 를 변경한 경우)
  useEffect(() => {
    setDisplayUser(user);
  }, [user]);

  // DB(profiles 테이블)에서 현재 로그인한 사용자의 최신 정보를 한 번 더 조회
  // - 로그인 직후 또는 새로고침 후에도 항상 DB 기준의 이름/학과/학년을 사용하기 위함
  // - 조회 결과를 displayUser + 수정 폼 상태(formName, formDepartment, formYear)에 반영
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Supabase profiles 테이블에서 id = user.id 인 행을 1건 조회
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email, department, year')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (data) {
          // DB에서 가져온 값과 기존 user props 를 합쳐서 최종 User 객체 생성
          const updated: User = {
            id: data.id,
            name: data.name ?? user.name,
            email: data.email ?? user.email,
            department: data.department ?? user.department,
            year: data.year ?? user.year,
          };

          setDisplayUser(updated);
          setFormName(updated.name);
          setFormDepartment(updated.department);
          setFormYear(updated.year);

          if (onUpdateUser) {
            onUpdateUser(updated);
          }
        }
      } catch (err) {
        console.error('사용자 프로필을 불러오는 중 오류가 발생했습니다:', err);
      }
    };

    fetchUserProfile();
  }, [user.id]);

  // "내 정보 수정" 서브 모달 상태 및 입력값
  // - isEditOpen: 수정 모달 열림/닫힘
  // - formName / formDepartment / formYear: 입력 폼의 현재 값
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formName, setFormName] = useState(displayUser.name);
  const [formDepartment, setFormDepartment] = useState(displayUser.department);
  const [formYear, setFormYear] = useState<number | ''>(displayUser.year ?? '');

  // ----------------------------------------------------------------
  // 내 프로필 목록 상태 (profiles_detail 테이블 기준)
  // ----------------------------------------------------------------
  // DB에서 불러온 내 프로필 목록
  // - 사용자가 작성한 팀원 모집 글(프로필 카드)을 모두 모아서 보여주기 위한 상태
  const [myProfiles, setMyProfiles] = useState<Profile[]>(profiles || []);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMyProfiles = async () => {
      try {
        setProfilesLoading(true);
        setProfilesError(null);

        // 현재 로그인한 user.id 를 기준으로 profiles_detail 테이블 조회
        // (user_id 컬럼으로 필터링, 최신 순 정렬)
        const { data, error } = await supabase
          .from('profiles_detail')
          .select('id, user_id, title, description, skills, interests, experience, contact, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        // 쿼리 결과(raw 데이터)를 화면에서 사용하기 쉬운 Profile 타입으로 변환
        const mapped: Profile[] = (data ?? []).map((row: any) => ({
          id: row.id ?? row.user_id ?? user.id,
          title: row.title ?? '',
          description: row.description ?? '',
          category: row.interests?.category ?? '',
          position: row.interests?.position ?? '',
          experience: row.experience?.level ?? '',
          contact: row.contact ?? '',
          skills: row.skills ?? [],
          projects: row.projects ?? [],
          createdAt: row.created_at ?? new Date().toISOString(),
          author: {
            name: displayUser.name,
            department: displayUser.department,
            year: displayUser.year,
          },
        }));

        setMyProfiles(mapped);
      } catch (err) {
        // 에러 발생 시 콘솔에 로그를 남기고 사용자에게는 간단한 오류 메시지를 표시
        console.error(err);
        setProfilesError('프로필을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setProfilesLoading(false);
      }
    };

    fetchMyProfiles();
  }, [user.id, user.name, user.department, user.year]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[900px] max-h-[90vh] px-4 [&>button]:hidden">
        <DialogHeader>
          <div className="flex items-center justify-between pr-2">
            <DialogTitle>프로필</DialogTitle>
            <div className="flex items-center gap-2">
              {/* 프로필 수정 버튼 (연필 아이콘) */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                className="p-1 hover:bg-accent"
                aria-label="프로필 수정"
              >
                <Pencil className="h-4 w-4" />
              </Button>

              {/* 닫기(X) 버튼 - 기본 상태는 아이콘만 보이고, hover 시 둥근 사각형 + 그림자 표시 */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-md p-0 hover:bg-accent hover:shadow-md transition-colors transition-shadow"
                aria-label="프로필 닫기"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <div className="space-y-6">
            {/* 상단: 로그인한 사용자의 기본 프로필 정보 영역 */}
            <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-green-200 text-green-800">
                  <UserIcon className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold truncate">{displayUser.name}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
                  <div className="flex items-center gap-1 min-w-0 max-w-xs">
                    <GraduationCap className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{displayUser.department}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>{displayUser.year}학년</span>
                  </div>
                  <div className="flex items-center gap-1 min-w-0 max-w-xs">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{displayUser.email}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* 하단: 내가 작성한 팀원 모집 프로필 카드 목록 */}
            <div>
              <h3 className="text-lg font-semibold mb-4">내가 작성한 프로필 ({myProfiles.length}개)</h3>
              
              {profilesLoading ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-muted-foreground">내 프로필을 불러오는 중입니다...</p>
                </div>
              ) : profilesError ? (
                <div className="text-center py-12 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600">{profilesError}</p>
                </div>
              ) : myProfiles.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-muted-foreground">아직 작성한 프로필이 없습니다.</p>
                  <p className="text-sm text-muted-foreground mt-2">새 프로필을 작성해보세요!</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {myProfiles.map((profile) => (
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

        {/* 사용자 정보 수정 모달
            - 이름 / 학과 / 학년만 수정 가능
            - 이메일은 로그인 계정 특성상 프론트에서 수정하지 않도록 고정 */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          {/* 기본 close 버튼 숨기고 직접 X 버튼을 그리기 위해 [&>button]:hidden 추가 */}
          <DialogContent className="max-w-md [&>button]:hidden">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>내 정보 수정</DialogTitle>

                {/* X 버튼 - 프로필 작성 모달과 동일한 스타일 */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditOpen(false)}
                  className="h-8 w-8 rounded-md p-0 hover:bg-accent hover:shadow-md transition-colors transition-shadow"
                  aria-label="내 정보 수정 닫기"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const sanitized: User = {
                  id: user.id,
                  name: String(formName).trim(),
                  email: user.email, // 이메일은 수정하지 않음
                  department: String(formDepartment).trim(),
                  year: Number(formYear) || 1,
                };

                try {
                  const { error } = await supabase
                    .from('profiles')
                    .update({
                      name: sanitized.name,
                      department: sanitized.department,
                      year: sanitized.year,
                    })
                    .eq('id', sanitized.id);

                  if (error) {
                    throw error;
                  }

                  if (onUpdateUser) onUpdateUser(sanitized);
                  setDisplayUser(sanitized);
                  setIsEditOpen(false);
                } catch (err: any) {
                  console.error(err);
                  alert('내 정보 수정 중 오류가 발생했습니다: ' + (err.message ?? String(err)));
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="홍길동"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">학과</Label>
                <Input
                  id="department"
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  placeholder="컴퓨터정보통신공학과"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">학년</Label>
                <Input
                  id="year"
                  type="number"
                  min={1}
                  max={6}
                  value={formYear}
                  onChange={(e) => setFormYear(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="3"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  닫기
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  저장
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}