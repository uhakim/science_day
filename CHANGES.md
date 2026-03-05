# 과학의 날 신청 앱 - 변경 사항 정리

## 1. UI 개선

### 로그인 페이지 (`app/login/page.tsx`, `app/login/login-form.tsx`)
- 화면 정중앙 배치 (세로 가운데 정렬 추가)
- 상단에 🔬 아이콘 + "과학의 날 Lab 신청" 타이틀 추가
- **반 입력 방식 변경**: 숫자 직접 입력 → select 드롭다운 (1~4반)
- 입력 필드 및 버튼 패딩 통일 (py-2.5 / py-3)

### Lab 카드 (`components/lab-card.tsx`)
- **잔여석 진행 바 추가**: 신청 인원 / 정원 시각화, 마감 시 빨간색으로 표시
- **잔여석 / 대기 인원 텍스트 표시**
- **내가 신청한 Lab 하이라이트**: 파란 테두리 + 배경 강조 + "신청됨" 배지
- **버튼 색 구분**:
  - 신청 → 파란색
  - 변경 → 짙은 회색
  - 취소 → 빨간색
- `isSelected` prop 추가

### 신청 현황 카드 (`components/registration-summary-card.tsx`)
- **상태 배지 추가**:
  - 신청 완료 → 초록색 배지
  - 대기 중 → 주황색 배지

### 헤더 (`app/labs/labs-client.tsx`, `app/status/status-client.tsx`)
- "🔬 과학의 날 Lab 신청" 브랜딩 문구 추가

---

## 2. 화면 깜박임 수정 (`app/labs/labs-client.tsx`)

- **원인**: 5초마다 자동 새로고침 시 매번 `setLoading(true)`를 호출해 목록이 사라졌다 나타남
- **수정**: `load(silent?: boolean)` 파라미터 추가 → 폴링 시에는 `silent=true`로 호출해 로딩 표시 없이 백그라운드 갱신

---

## 3. 환경 설정 (`.env.local`)

로컬 개발 환경 실행을 위한 환경 변수 파일 생성:

```
NEXT_PUBLIC_SUPABASE_URL=https://azdyngqyhkfzjuzhuvhn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SESSION_SECRET=...
```

> ⚠️ `.env.local`은 절대 git에 커밋하지 말 것 (DB 전체 권한 키 포함)

---

## 4. DB 버그 수정 (`supabase/schema.sql`)

### `rpc_apply_lab` 함수 ambiguous column 오류

- **원인**: `INSERT ... RETURNING` 절에서 `status`, `timestamp`, `lab_id` 컬럼명이 함수의 반환 변수 이름과 동일해 PostgreSQL이 어느 것을 가리키는지 판단 불가 (`column reference "status" is ambiguous`, error code `42702`)
- **수정**: RETURNING 절에 테이블명 명시

```sql
-- 수정 전
returning id, status, "timestamp", lab_id
  into registration_id, status, "timestamp", lab_id;

-- 수정 후
returning
  registrations.id,
  registrations.status,
  registrations."timestamp",
  registrations.lab_id
  into registration_id, status, "timestamp", lab_id;
```

- Supabase SQL Editor에서 `CREATE OR REPLACE FUNCTION rpc_apply_lab` 재실행으로 적용
