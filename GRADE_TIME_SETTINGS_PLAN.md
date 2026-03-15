# 학년별 신청 가능 시간 설정 구현 계획

## 1. 배경

현재 신청 가능 시간은 전교 공통 1세트만 저장된다.

- DB: `registration_settings` 단일 row에 `open_at`, `close_at` 저장
- 관리자 UI: 시작 시간 / 종료 시간 입력 1세트만 제공
- 학생 신청 가능 여부: 모든 학년에 동일한 시간 기준으로 판정

요구사항은 다음과 같다.

- 관리자에서 여러 학년을 체크할 수 있어야 한다.
- 체크한 학년들에 동일한 신청 시작/종료 시간을 한 번에 적용할 수 있어야 한다.
- 다른 학년 묶음에는 다른 시간을 다시 적용할 수 있어야 한다.
- 학생은 자신의 학년 기준 시간만 적용받아야 한다.

예시:

- 1, 2학년 체크 후 `3월 13일 14:00` 적용
- 3, 4학년 체크 후 `3월 14일 15:00` 적용
- 각 학년은 서로 다른 신청 가능 시간을 가진다

## 2. 권장 설계

### 2-1. 저장 구조

체크박스는 "입력 UX"로만 사용하고, 실제 저장은 "학년별 1건" 구조로 관리한다.

권장 테이블:

- `registration_grade_settings`

권장 컬럼:

- `grade smallint primary key`
- `open_at timestamptz`
- `close_at timestamptz`
- `updated_at timestamptz(3) not null`

이 구조를 추천하는 이유:

- 1개 학년만 수정하기 쉽다.
- 여러 학년을 한 번에 선택해도 서버에서는 단순 `upsert`로 처리할 수 있다.
- 현재 요구사항인 "체크한 학년 묶음에 같은 시간 적용"과 "학년별 개별 시간 유지"를 동시에 만족한다.
- 추후 반별/학급별 확장이 필요해도 구조를 확장하기 쉽다.

### 2-2. 기존 테이블 유지 여부

기존 `registration_settings`는 아래 둘 중 하나로 정리한다.

- 선택안 A: 새 테이블 적용 후 더 이상 사용하지 않음
- 선택안 B: 과도기 호환용으로 잠시 유지 후 제거

권장안은 A다.

이유:

- 현재 단일 row 제약(`id = 1`)이 학년별 구조와 맞지 않는다.
- 기존 테이블을 억지로 확장하면 조회/검증 코드가 더 복잡해진다.
- 새 테이블로 분리하면 책임이 명확하다.

## 3. 목표 UX

관리자 `시간 설정` 탭에서 다음 흐름을 제공한다.

1. 1~6학년 체크박스를 보여준다.
2. 시작 시간 / 종료 시간을 입력한다.
3. `선택 학년에 적용` 버튼으로 체크한 학년들에 동일한 시간을 저장한다.
4. 현재 학년별 설정 현황을 표 또는 카드 목록으로 보여준다.
5. 각 학년의 현재 상태를 `대기`, `진행 중`, `마감`으로 표시한다.
6. 필요 시 `선택 학년 초기화`로 해당 학년 설정만 비운다.

권장 추가 UX:

- "선택된 학년이 없습니다" 검증
- `종료 시간 <= 시작 시간` 검증
- 현재 시간 기준 상태 뱃지 표시
- 각 학년별 현재 설정값 미리보기

## 4. 상세 작업 목록

### 4-1. 1단계: DB / Supabase 구조 변경

- [ ] `registration_grade_settings` 테이블 추가
- [ ] `grade between 1 and 6` 체크 제약 추가
- [ ] `close_at > open_at` 유효성은 앱 레벨에서 우선 검증
- [ ] 1~6학년 기본 row 생성 방식 결정
- [ ] 기존 `registration_settings` 값이 있으면 1~6학년에 백필하는 SQL 추가
- [ ] 기존 `registration_settings`를 유지할지 제거할지 결정

### 4-2. 2단계: 타입 및 공용 로직 정리

- [ ] `lib/database.types.ts`에 신규 테이블 타입 반영
- [ ] `lib/registration-settings.ts`를 학년별 조회/판정 구조로 개편
- [ ] `RegistrationSettings` 타입을 학년 정보 포함 구조로 확장할지 결정
- [ ] `fetchRegistrationSettingsForGrade(grade)` 추가
- [ ] `fetchAllRegistrationGradeSettings()` 추가
- [ ] `getRegistrationStatus()`는 재사용하되 입력 타입만 조정

### 4-3. 3단계: 학생 화면/학생 API 변경

- [ ] 학생 신청 페이지에서 `session.grade` 기준 설정 조회
- [ ] 신청 API(`apply`)에서 `session.grade` 기준 오픈 여부 검사
- [ ] 변경 API(`change`)에서 `session.grade` 기준 오픈 여부 검사
- [ ] 취소 API(`cancel`)에서 `session.grade` 기준 오픈 여부 검사
- [ ] 필요 시 공개 settings API의 역할 재정의 또는 정리

### 4-4. 4단계: 관리자 API 변경

- [ ] 관리자 settings GET 응답을 "학년별 목록" 구조로 변경
- [ ] 관리자 settings POST 요청을 "선택 학년 일괄 적용" 구조로 변경
- [ ] 관리자 settings 초기화 요청을 "선택 학년 초기화" 구조로 변경
- [ ] 요청 body 검증 추가
- [ ] 부분 실패 없이 처리되도록 `upsert` 또는 단일 트랜잭션 전략 정리

### 4-5. 5단계: 관리자 UI 변경

- [ ] 현재 단일 시작/종료 입력 폼 제거 또는 대체
- [ ] 1~6학년 체크박스 UI 추가
- [ ] 시작 시간 / 종료 시간 입력 폼 유지
- [ ] `선택 학년에 적용` 버튼 추가
- [ ] `선택 학년 초기화` 버튼 추가
- [ ] 학년별 현재 설정 목록 UI 추가
- [ ] 학년별 상태 뱃지 추가
- [ ] 저장/초기화 완료 메시지 정리
- [ ] 시간대 표시 방식 보정

### 4-6. 6단계: 검증 및 운영 확인

- [ ] 1개 학년만 설정하는 시나리오 확인
- [ ] 여러 학년에 같은 시간 일괄 적용 시나리오 확인
- [ ] 이미 설정된 학년에 다른 시간 덮어쓰기 시나리오 확인
- [ ] 종료 시간 없이 오픈 상태 유지 시나리오 확인
- [ ] 미설정 학년은 계속 `대기`로 보이는지 확인
- [ ] 학생 로그인 후 본인 학년 기준으로만 상태가 보이는지 확인
- [ ] 신청/변경/취소가 학년별 시간에 맞게 차단되는지 확인

## 5. 파일별 변경 예상 범위

### Supabase / DB

- `supabase/schema.sql`
- `lib/database.types.ts`

### 공용 서버 로직

- `lib/registration-settings.ts`

### 학생 서버/페이지

- `app/labs/page.tsx`
- `app/api/registrations/apply/route.ts`
- `app/api/registrations/change/route.ts`
- `app/api/registrations/cancel/route.ts`
- `app/api/settings/route.ts` 또는 정리 대상

### 관리자 서버/페이지

- `app/api/admin/settings/route.ts`
- `app/admin/admin-client.tsx`

## 6. Supabase에서 손봐야 할 부분

### 6-1. 신규 테이블 추가

예시 스키마:

```sql
create table if not exists public.registration_grade_settings (
  grade smallint primary key check (grade between 1 and 6),
  open_at timestamptz,
  close_at timestamptz,
  updated_at timestamptz(3) not null default date_trunc('milliseconds', clock_timestamp())
);
```

권장 보조 초기화:

```sql
insert into public.registration_grade_settings (grade)
select g
from generate_series(1, 6) as g
on conflict (grade) do nothing;
```

### 6-2. 기존 데이터 백필

현재 `registration_settings`에 값이 있다면 아래 방식으로 초기 배포 시 백필한다.

```sql
insert into public.registration_grade_settings (grade, open_at, close_at)
select g, rs.open_at, rs.close_at
from generate_series(1, 6) as g
cross join public.registration_settings rs
where rs.id = 1
on conflict (grade) do update
set open_at = excluded.open_at,
    close_at = excluded.close_at,
    updated_at = date_trunc('milliseconds', clock_timestamp());
```

의도:

- 운영 중 기존 공통 설정이 사라지지 않게 한다.
- 배포 직후에는 기존과 동일하게 모든 학년이 같은 시간으로 유지된다.

### 6-3. 타입 반영

이 프로젝트는 `lib/database.types.ts`를 직접 보유하고 있으므로, 신규 테이블 타입을 반영해야 한다.

반영 대상:

- `Row`
- `Insert`
- `Update`

필요 시 Supabase 타입 생성 결과를 기준으로 동기화하되, 현재 저장소 흐름상 수동 반영 가능성이 높다.

### 6-4. 함수 / RPC 수정 여부

현재 신청/변경/취소 핵심은 Next API에서 시간 검증 후 RPC를 호출한다.

즉, 이번 요구사항에서는 Supabase RPC 자체를 바꿀 필요는 크지 않다.

정리:

- 필수: 테이블 추가, 데이터 백필, 타입 반영
- 선택: RPC 내부에서도 시간 검증까지 넣는 이중 방어

권장 판단:

- 이번 범위에서는 Next API에서 학년별 시간 검증을 유지
- 나중에 보안 강화를 원하면 RPC 단에도 검증 로직 추가 검토

### 6-5. 운영 절차

Supabase에서 실제로 해야 할 일:

1. SQL Editor에서 신규 테이블 생성 SQL 실행
2. 1~6학년 기본 row 생성 SQL 실행
3. 기존 공통 설정 백필 SQL 실행
4. 결과 데이터 확인
5. 앱 코드 배포
6. 앱 배포 후 관리자 화면에서 학년별 설정 재확인

## 7. API 설계 초안

### 7-1. 관리자 GET

`GET /api/admin/settings`

응답 예시:

```json
{
  "settings": [
    { "grade": 1, "openAt": "2026-03-13T05:00:00.000Z", "closeAt": null, "status": "open" },
    { "grade": 2, "openAt": "2026-03-13T05:00:00.000Z", "closeAt": null, "status": "open" },
    { "grade": 3, "openAt": "2026-03-14T06:00:00.000Z", "closeAt": null, "status": "pending" }
  ]
}
```

### 7-2. 관리자 POST

`POST /api/admin/settings`

요청 예시:

```json
{
  "grades": [1, 2, 3],
  "openAt": "2026-03-13T05:00:00.000Z",
  "closeAt": "2026-03-13T08:00:00.000Z"
}
```

동작:

- 선택한 학년 row에 대해 `upsert`
- `closeAt`가 없으면 `null`
- 학년 배열이 비어 있으면 `BAD_REQUEST`

### 7-3. 관리자 초기화 POST

같은 엔드포인트를 재사용할 수 있다.

요청 예시:

```json
{
  "grades": [4, 5],
  "openAt": null,
  "closeAt": null
}
```

동작:

- 선택 학년의 시간을 비움
- 상태는 `pending`

## 8. 애플리케이션 코드 설계 초안

### 8-1. 공용 로직

`lib/registration-settings.ts`

추가 권장 함수:

- `fetchRegistrationSettingsForGrade(grade: number)`
- `fetchAllRegistrationGradeSettings()`
- `getRegistrationStatus(settings)`
- `isRegistrationOpen(settings)`

### 8-2. 학생 페이지

`app/labs/page.tsx`

변경 방향:

- 현재는 공통 설정 1건 조회
- 변경 후에는 `session.grade`로 학년별 설정 조회

### 8-3. 학생 API

대상:

- `app/api/registrations/apply/route.ts`
- `app/api/registrations/change/route.ts`
- `app/api/registrations/cancel/route.ts`

변경 방향:

- `fetchRegistrationSettings()` 대신 `fetchRegistrationSettingsForGrade(session.grade)` 사용

### 8-4. 관리자 페이지

`app/admin/admin-client.tsx`

변경 방향:

- 상태값을 단일 `openAt/closeAt/status`에서 학년별 배열 상태로 변경
- 체크박스 선택 상태 관리
- 저장 성공 시 학년별 목록 재조회

## 9. 구현 시 주의사항

### 9-1. 시간대 처리

현재 관리자 `datetime-local` 값 변환은 UTC 기준으로 보정되어 로컬 시간과 어긋날 가능성이 있다.

이번 작업 때 같이 정리하는 것이 안전하다.

권장:

- 입력값 표시 시 로컬 시간대 기준 포맷 함수 사용
- 저장 시에만 ISO 문자열로 변환

### 9-2. 초기화 범위

전체 초기화보다 `선택 학년 초기화`가 안전하다.

이유:

- 특정 학년 시간만 조정할 때 실수로 전체를 닫는 사고를 줄일 수 있다.

### 9-3. 미설정 학년 처리

`open_at = null`이면 `pending`으로 보는 현재 규칙을 유지하는 것이 자연스럽다.

즉:

- 아직 시간을 잡지 않은 학년은 신청 불가
- 추후 시간 입력 후 바로 열림 또는 예약 열림

## 10. 수동 검증 시나리오

### 시나리오 A

- 1학년만 `2026-03-13 14:00`으로 설정
- 1학년 학생은 카운트다운 또는 오픈 상태 확인
- 2학년 학생은 여전히 대기 상태 확인

### 시나리오 B

- 2, 3, 4학년을 동시에 선택
- 동일한 시작 시간 적용
- 관리자 목록에서 2, 3, 4학년만 같은 값으로 갱신되는지 확인

### 시나리오 C

- 4학년은 종료 시간 포함
- 5학년은 종료 시간 없이 오픈
- 마감 상태와 진행 중 상태가 분리되어 보이는지 확인

### 시나리오 D

- 이미 신청한 학생이 마감 후 `변경` 또는 `취소` 시도
- 기존처럼 차단되는지 확인

## 11. 구현 순서 제안

1. Supabase 테이블 추가 및 백필 SQL 준비
2. `database.types.ts` 반영
3. `lib/registration-settings.ts` 개편
4. 학생 API와 학생 페이지를 학년별 조회로 전환
5. 관리자 API를 학년별 구조로 전환
6. 관리자 UI를 체크박스 + 학년별 현황 형태로 전환
7. 시간대 표시 버그 보정
8. 수동 검증

## 12. 이번 문서 기준 결론

이 요구사항은 현재 구조에서 충분히 구현 가능하다.

핵심 포인트는 다음 3가지다.

- 체크박스는 "여러 학년에 같은 값을 한 번에 적용하는 입력 방식"으로 쓴다.
- 실제 저장은 "학년별 설정 row"로 분리한다.
- 학생 신청 가능 여부는 항상 `session.grade` 기준으로 판정한다.

이 기준으로 진행하면 요구사항을 깔끔하게 만족하면서 이후 유지보수도 쉬운 편이다.
