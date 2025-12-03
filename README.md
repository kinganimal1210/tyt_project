# Team Matching Platform

chat-server에서 npm install
.env파일 만들기

PORT=4000
SUPABASE_URL=여기에 url
SUPABASE_SERVICE_ROLE_KEY=여기에 service role key

frontend에서 npm install
.env.local파일 만들기

NEXT_PUBLIC_CHAT_SERVER_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=여기에 url
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에 anon key
SUPABASE_SERVICE_ROLE_KEY=여기에 service role key

터미널 2개로 chat-server, frontend 각각 가서 npm run dev 각각 실행
# Team Matching Platform

전남대학교 학생들을 대상으로 캡스톤, 팀 프로젝트, 공모전 등에서 함께할 팀원을 효율적으로 찾을 수 있도록 돕는 팀 매칭 플랫폼이다.  
학생 개개인의 프로필과 관심 분야, 기술 스택, 협업 성향 등을 기반으로 팀/팀원 매칭을 지원하며, 실시간 채팅과 AI 추천 기능을 제공한다.

---

## 주요 기능

### 1. 인증 및 사용자 관리
- 전남대학교 이메일 기반 회원가입/로그인 (Supabase Auth 사용)
- 사용자 기본 정보 및 프로필 관리
  - 학과, 학년
  - 보유 기술 스택
  - 관심 분야(예: 웹/앱, 인공지능, 임베디드, 게임 등)
  - 선호 역할(기획, 프론트엔드, 백엔드, 디자이너 등)
  - 협업 스타일, 선호 작업 시간대 등

### 2. 팀/팀원 모집 피드
- 팀원이 필요한 팀이 구인 글 작성
- 프로젝트를 같이할 팀을 찾는 학생이 구직 글 작성
- 주요 항목
  - 모집 분야 및 인원
  - 프로젝트 주제/간단 소개
  - 사용 예정 기술 스택
  - 예상 기간, 회의 방식(온라인/오프라인)
- 최신순 정렬 및 검색/필터링 기능
  - 키워드 검색
  - 분야/기술 스택/학년 등으로 필터링

### 3. 실시간 채팅
- 게시글 작성자와 관심 있는 사용자가 1:1 실시간 채팅
- 팀 구성 전, 간단한 질의응답 및 일정 조율 가능
- 채팅 서버는 별도의 Node.js 기반 서버(`chat-server`)로 구성

### 4. AI 추천 모드 (선택 기능)
- 사용자 프로필과 과거 상호작용 데이터를 기반으로 추천 점수 계산
- 예시 구성
  - Jaccard 유사도로 사용자와 게시글 간 특성(기술, 관심 분야 등)의 유사도 측정
  - 다양한 특성(feature)을 활용한 ANN(인공 신경망)으로 매칭 적합도 예측
  - 실제 채팅 발생률/응답률을 로지스틱 회귀로 모델링해 추천 점수 보정
- 추천 모드에서 사용자는 일반 피드 대신 개인화된 추천 피드를 확인할 수 있음

---

## 시스템 구조 개요

프로젝트는 크게 다음과 같이 구성된다.

- `frontend`  
  - Next.js 기반 웹 프론트엔드
  - Supabase 클라이언트 사용
  - 프로필/피드/AI 추천/채팅 UI 구현

- `chat-server`  
  - Node.js 기반 커스텀 채팅 서버
  - WebSocket 또는 Socket 기반 실시간 통신
  - Supabase와 연동하여 사용자 인증 및 일부 데이터 조회

- `Supabase`  
  - 인증(Auth), 데이터베이스(PostgreSQL), 스토리지 등 제공
  - 주요 테이블 예시: `profiles`, `posts`, `messages`, `ai_logs` 등

---

## 기술 스택

### Frontend
- Next.js (React 기반)
- TypeScript
- Supabase JS Client
- CSS/스타일링 도구 (예: CSS Modules, Tailwind CSS 등 프로젝트 설정에 따라 변경)

### Backend / Chat Server
- Node.js
- (필요 시) Express 또는 유사한 HTTP 프레임워크
- WebSocket 기반 실시간 통신 라이브러리

### Infra / 기타
- Supabase (Auth, Database, Storage)
- npm

---

## 디렉터리 구조 (예시)

```bash
team_project/
├── frontend/        # Next.js 프론트엔드
├── chat-server/     # 실시간 채팅 서버
└── README.md
```

실제 디렉터리 구조는 프로젝트 진행 상황에 따라 일부 다를 수 있다.

---

## 사전 준비사항

1. Node.js 설치  
   - LTS 버전(예: 18.x 이상) 권장  
   - https://nodejs.org 에서 설치

2. Supabase 프로젝트 생성  
   - https://supabase.com 에서 무료 프로젝트 생성  
   - 프로젝트 대시보드에서 다음 값 확인
     - `Project URL` (SUPABASE_URL)
     - `anon public` 키 (SUPABASE_ANON_KEY)
     - `service_role` 키 (SUPABASE_SERVICE_ROLE_KEY, 서버 전용)

3. Git 클론 (필요 시)
```bash
git clone <이 레포지토리 URL>
cd team_project
```

---

## 환경 변수 설정

### 1) chat-server

`team_project/chat-server` 디렉터리에서 `.env` 파일을 생성하고 다음 내용을 작성한다.

```bash
PORT=4000
SUPABASE_URL=여기에_supabase_url
SUPABASE_SERVICE_ROLE_KEY=여기에_service_role_key
```

- `PORT`  
  - 채팅 서버가 사용할 포트 번호  
  - 기본 예시는 `4000`

- `SUPABASE_URL`  
  - Supabase 프로젝트 URL

- `SUPABASE_SERVICE_ROLE_KEY`  
  - 서버 전용 권한이므로 반드시 서버 측에서만 사용해야 한다.
  - 이 값은 절대로 클라이언트에 노출되면 안 된다.

### 2) frontend

`team_project/frontend` 디렉터리에서 `.env.local` 파일을 생성하고 다음 내용을 작성한다.

```bash
NEXT_PUBLIC_CHAT_SERVER_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=여기에_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=여기에_service_role_key
```

- `NEXT_PUBLIC_CHAT_SERVER_URL`  
  - 프론트엔드에서 사용할 채팅 서버 주소  
  - 개발 환경에서는 `http://localhost:4000` 사용

- `NEXT_PUBLIC_SUPABASE_URL`  
  - 프론트엔드에서 사용할 Supabase URL

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
  - 프론트엔드에서 사용할 anon public key

- `SUPABASE_SERVICE_ROLE_KEY`  
  - 서버 사이드 렌더링(SSR) 또는 API Route에서만 사용해야 하는 키  
  - `NEXT_PUBLIC_`가 붙지 않았으므로 클라이언트로 노출되지 않는다.

---

## 설치 및 실행 방법

### 1) chat-server 실행

```bash
cd chat-server
npm install
npm run dev
```

- `.env` 설정이 완료되어 있어야 정상적으로 실행된다.
- 기본적으로 `http://localhost:4000`에서 서버가 동작한다.

### 2) frontend 실행

새 터미널을 하나 더 열어 다음을 실행한다.

```bash
cd frontend
npm install
npm run dev
```

- `.env.local` 설정이 완료되어 있어야 한다.
- 기본적으로 `http://localhost:3000`에서 프론트엔드가 동작한다.

---

## 개발 중 자주 발생할 수 있는 이슈

1. 환경 변수 미설정
   - Supabase URL 또는 키가 잘못되었을 경우 로그인, 데이터 조회가 실패한다.
   - `.env`, `.env.local` 파일이 실제로 존재하는지, 재시작이 필요한지 확인한다.

2. CORS 또는 URL 오타
   - `NEXT_PUBLIC_CHAT_SERVER_URL`이 실제 채팅 서버 주소와 다르면 채팅 연결이 되지 않는다.
   - 포트 번호와 프로토콜(`http`/`https`)을 정확히 확인한다.

3. Supabase 권한 설정
   - RLS(Row Level Security)를 사용하는 경우, 정책 설정이 적절한지 확인해야 한다.
   - 개발 초기에는 테스트를 위해 읽기/쓰기 권한을 넉넉하게 설정하고, 이후 점진적으로 강화하는 방식을 사용할 수 있다.

---

## 향후 개선 및 확장 아이디어

- 매칭 결과에 대한 피드백 수집 및 AI 모델 고도화
- 프로젝트/팀 리뷰 기능 추가
- 푸시 알림(웹/모바일) 연동
- 캘린더 연동을 통한 회의 일정 자동 조율
- 모바일 환경에 최적화된 UI/UX 개선

---

## 기여 방법

이 프로젝트는 캡스톤 디자인 및 팀 프로젝트 과제용으로 시작되었으나, 필요에 따라 기능을 확장하거나 리팩토링할 수 있다.

- 이슈/버그 제보: GitHub Issues에 등록
- 기능 제안: 이슈에 제안 내용을 작성하거나 문서화
- 코드 기여: 별도 브랜치에서 작업 후 Pull Request 생성

---

## 라이선스

교육 및 학습 목적의 프로젝트로, 별도의 명시가 없는 한 팀 내부 사용을 기본으로 한다.  
외부 공개 또는 상용화가 필요한 경우, 팀 내 합의를 거쳐 라이선스 정책을 정한 후 적용한다.