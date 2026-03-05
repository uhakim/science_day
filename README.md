# 과학의 날 Lab 신청 시스템

Next.js(App Router) + TailwindCSS + Supabase(PostgreSQL/RPC) 기반 예제 프로젝트입니다.

## 주요 기능

- 학생 로그인 (`grade + class + name` 유니크 식별)
- 학년군별 Lab 목록 조회 (LOW/HIGH)
- Lab 신청 / 변경 / 취소
- 정원 초과 시 자동 대기 등록
- confirmed 취소 시 waiting 자동 승격
- 신청 시간(밀리초) 및 대기 순번 표시

## 프로젝트 구조

```text
science-day-app/
  app/
    api/
      auth/
        login/route.ts
        logout/route.ts
      labs/route.ts
      registrations/
        apply/route.ts
        change/route.ts
        cancel/route.ts
        me/route.ts
    labs/
      labs-client.tsx
      page.tsx
    login/
      login-form.tsx
      page.tsx
    status/
      page.tsx
      status-client.tsx
    globals.css
    layout.tsx
    page.tsx
  components/
    lab-card.tsx
    logout-button.tsx
    registration-summary-card.tsx
  lib/
    api-auth.ts
    env.ts
    errors.ts
    format.ts
    http.ts
    server-auth.ts
    sessions.ts
    supabase.ts
    types.ts
  supabase/
    schema.sql
  .env.example
```

## 실행 방법

1. 패키지 설치

```bash
npm install
```

2. 환경 변수 설정

`.env.example`를 복사해 `.env.local` 생성 후 값 입력:

```bash
cp .env.example .env.local
```

필수 값:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`

3. Supabase SQL 실행

Supabase SQL Editor에서 `supabase/schema.sql` 전체 실행.

4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

## Supabase SQL

- 위치: `supabase/schema.sql`
- 포함 내용:
  - `students`, `labs`, `registrations` 테이블
  - 부분 유니크 인덱스(학생 1명 활성 신청 1건)
  - `rpc_apply_lab`, `rpc_change_lab`, `rpc_cancel_lab`, `rpc_promote_waiting`
  - `rpc_get_labs_for_group`, `rpc_get_my_registration`
  - 초기 Lab 12개(LOW 1~6, HIGH 1~6) seed

## Vercel 배포

1. Git 저장소에 코드 push
2. Vercel에서 프로젝트 Import
3. Environment Variables 설정:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (선택)
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET`
4. Deploy

배포 후에도 Supabase DB에는 `supabase/schema.sql`이 적용되어 있어야 합니다.

