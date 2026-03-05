create extension if not exists pgcrypto;

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  grade smallint not null check (grade between 1 and 6),
  "class" smallint not null check ("class" >= 1),
  name text not null check (btrim(name) <> ''),
  created_at timestamptz(3) not null default date_trunc('milliseconds', clock_timestamp()),
  updated_at timestamptz(3) not null default date_trunc('milliseconds', clock_timestamp()),
  constraint uq_students_identity unique (grade, "class", name)
);

create table if not exists public.labs (
  id uuid primary key default gen_random_uuid(),
  group_type text not null check (group_type in ('LOW', 'HIGH')),
  lab_number smallint not null check (lab_number between 1 and 6),
  capacity smallint not null default 15 check (capacity = 15),
  created_at timestamptz(3) not null default date_trunc('milliseconds', clock_timestamp()),
  updated_at timestamptz(3) not null default date_trunc('milliseconds', clock_timestamp()),
  constraint uq_labs_group_labno unique (group_type, lab_number)
);

create table if not exists public.registrations (
  id bigserial primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  lab_id uuid not null references public.labs(id) on delete restrict,
  status text not null check (status in ('confirmed', 'waiting', 'cancelled')),
  "timestamp" timestamptz(3) not null default date_trunc('milliseconds', clock_timestamp()),
  cancelled_at timestamptz(3),
  created_at timestamptz(3) not null default date_trunc('milliseconds', clock_timestamp()),
  updated_at timestamptz(3) not null default date_trunc('milliseconds', clock_timestamp()),
  constraint ck_reg_cancelled_at
    check (
      (status = 'cancelled' and cancelled_at is not null)
      or (status in ('confirmed', 'waiting') and cancelled_at is null)
    )
);

create unique index if not exists ux_registrations_one_active_per_student
on public.registrations (student_id)
where status in ('confirmed', 'waiting');

create index if not exists idx_registrations_waiting_queue
on public.registrations (lab_id, "timestamp", id)
where status = 'waiting';

create index if not exists idx_registrations_confirmed_lab
on public.registrations (lab_id)
where status = 'confirmed';

create table if not exists public.registration_settings (
  id int primary key default 1,
  open_at  timestamptz,
  close_at timestamptz,
  updated_at timestamptz(3) not null default date_trunc('milliseconds', clock_timestamp()),
  constraint ck_registration_settings_single_row check (id = 1)
);
insert into public.registration_settings (id) values (1) on conflict do nothing;

create or replace function public.ms_now()
returns timestamptz(3)
language sql
volatile
as $$
  select date_trunc('milliseconds', clock_timestamp())::timestamptz(3);
$$;

create or replace function public.rpc_get_labs_for_group(p_group_type text)
returns table (
  id uuid,
  group_type text,
  lab_number smallint,
  capacity smallint,
  confirmed_count int,
  waiting_count int
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    l.id,
    l.group_type,
    l.lab_number,
    l.capacity,
    coalesce(sum((r.status = 'confirmed')::int), 0)::int as confirmed_count,
    coalesce(sum((r.status = 'waiting')::int), 0)::int as waiting_count
  from public.labs l
  left join public.registrations r
    on r.lab_id = l.id
   and r.status in ('confirmed', 'waiting')
  where l.group_type = p_group_type
  group by l.id
  order by l.lab_number asc;
$$;

create or replace function public.rpc_get_my_registration(p_student_id uuid)
returns table (
  registration_id bigint,
  student_id uuid,
  lab_id uuid,
  lab_number smallint,
  group_type text,
  status text,
  "timestamp" timestamptz(3),
  queue_position int
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with active_registration as (
    select
      r.id as registration_id,
      r.student_id,
      r.lab_id,
      l.lab_number,
      l.group_type,
      r.status,
      r."timestamp"
    from public.registrations r
    join public.labs l on l.id = r.lab_id
    where r.student_id = p_student_id
      and r.status in ('confirmed', 'waiting')
    order by r."timestamp" desc, r.id desc
    limit 1
  )
  select
    ar.registration_id,
    ar.student_id,
    ar.lab_id,
    ar.lab_number,
    ar.group_type,
    ar.status,
    ar."timestamp",
    case
      when ar.status = 'waiting' then (
        select count(*)::int
        from public.registrations w
        where w.lab_id = ar.lab_id
          and w.status = 'waiting'
          and (
            w."timestamp" < ar."timestamp"
            or (w."timestamp" = ar."timestamp" and w.id <= ar.registration_id)
          )
      )
      else null
    end as queue_position
  from active_registration ar;
$$;

create or replace function public.rpc_promote_waiting(p_lab_id uuid)
returns table (
  promoted_count int,
  promoted_registration_ids bigint[]
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_capacity smallint;
  v_confirmed_count int;
  v_waiting_id bigint;
  v_promoted_ids bigint[] := '{}'::bigint[];
begin
  select l.capacity
    into v_capacity
  from public.labs l
  where l.id = p_lab_id
  for update;

  if not found then
    raise exception 'LAB_NOT_FOUND';
  end if;

  select count(*)
    into v_confirmed_count
  from public.registrations r
  where r.lab_id = p_lab_id
    and r.status = 'confirmed';

  while v_confirmed_count < v_capacity loop
    select r.id
      into v_waiting_id
    from public.registrations r
    where r.lab_id = p_lab_id
      and r.status = 'waiting'
    order by r."timestamp" asc, r.id asc
    limit 1
    for update skip locked;

    exit when v_waiting_id is null;

    update public.registrations
       set status = 'confirmed',
           updated_at = public.ms_now()
     where id = v_waiting_id;

    v_promoted_ids := array_append(v_promoted_ids, v_waiting_id);
    v_confirmed_count := v_confirmed_count + 1;
    v_waiting_id := null;
  end loop;

  return query
  select
    coalesce(array_length(v_promoted_ids, 1), 0),
    coalesce(v_promoted_ids, '{}'::bigint[]);
end;
$$;

create or replace function public.rpc_apply_lab(
  p_student_id uuid,
  p_lab_id uuid
)
returns table (
  registration_id bigint,
  status text,
  "timestamp" timestamptz(3),
  lab_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz(3) := public.ms_now();
  v_grade smallint;
  v_group_type text;
  v_capacity smallint;
  v_confirmed_count int;
  v_status text;
begin
  select s.grade
    into v_grade
  from public.students s
  where s.id = p_student_id
  for update;

  if not found then
    raise exception 'STUDENT_NOT_FOUND';
  end if;

  select l.group_type, l.capacity
    into v_group_type, v_capacity
  from public.labs l
  where l.id = p_lab_id
  for update;

  if not found then
    raise exception 'LAB_NOT_FOUND';
  end if;

  if (v_grade between 1 and 3 and v_group_type <> 'LOW')
     or (v_grade between 4 and 6 and v_group_type <> 'HIGH') then
    raise exception 'GRADE_GROUP_MISMATCH';
  end if;

  if exists (
    select 1
    from public.registrations r
    where r.student_id = p_student_id
      and r.status in ('confirmed', 'waiting')
  ) then
    raise exception 'ALREADY_HAS_ACTIVE_REGISTRATION';
  end if;

  select count(*)
    into v_confirmed_count
  from public.registrations r
  where r.lab_id = p_lab_id
    and r.status = 'confirmed';

  if v_confirmed_count < v_capacity then
    v_status := 'confirmed';
  else
    v_status := 'waiting';
  end if;

  insert into public.registrations (
    student_id, lab_id, status, "timestamp", created_at, updated_at
  )
  values (
    p_student_id, p_lab_id, v_status, v_now, v_now, v_now
  )
  returning
    registrations.id,
    registrations.status,
    registrations."timestamp",
    registrations.lab_id
    into registration_id, status, "timestamp", lab_id;

  return next;

exception
  when unique_violation then
    raise exception 'ALREADY_HAS_ACTIVE_REGISTRATION';
end;
$$;

create or replace function public.rpc_cancel_lab(p_student_id uuid)
returns table (
  cancelled_registration_id bigint,
  cancelled_lab_id uuid,
  promoted_count int,
  promoted_registration_ids bigint[]
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz(3) := public.ms_now();
  v_registration_id bigint;
  v_lab_id uuid;
  v_old_status text;
  v_promoted_count int := 0;
  v_promoted_ids bigint[] := '{}'::bigint[];
begin
  perform 1
  from public.students s
  where s.id = p_student_id
  for update;

  if not found then
    raise exception 'STUDENT_NOT_FOUND';
  end if;

  select r.id, r.lab_id, r.status
    into v_registration_id, v_lab_id, v_old_status
  from public.registrations r
  where r.student_id = p_student_id
    and r.status in ('confirmed', 'waiting')
  order by r."timestamp" desc, r.id desc
  limit 1
  for update;

  if not found then
    raise exception 'NO_ACTIVE_REGISTRATION';
  end if;

  update public.registrations
     set status = 'cancelled',
         cancelled_at = v_now,
         updated_at = v_now
   where id = v_registration_id;

  if v_old_status = 'confirmed' then
    select p.promoted_count, p.promoted_registration_ids
      into v_promoted_count, v_promoted_ids
    from public.rpc_promote_waiting(v_lab_id) p;
  end if;

  cancelled_registration_id := v_registration_id;
  cancelled_lab_id := v_lab_id;
  promoted_count := v_promoted_count;
  promoted_registration_ids := v_promoted_ids;
  return next;
end;
$$;

create or replace function public.rpc_change_lab(
  p_student_id uuid,
  p_new_lab_id uuid
)
returns table (
  old_registration_id bigint,
  new_registration_id bigint,
  new_lab_id uuid,
  new_status text,
  new_timestamp timestamptz(3),
  promoted_count int,
  promoted_registration_ids bigint[]
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz(3) := public.ms_now();
  v_grade smallint;
  v_old_registration_id bigint;
  v_old_lab_id uuid;
  v_old_status text;
  v_group_type text;
  v_capacity smallint;
  v_confirmed_count int;
  v_new_status text;
  v_new_registration_id bigint;
  v_new_timestamp timestamptz(3);
  v_promoted_count int := 0;
  v_promoted_ids bigint[] := '{}'::bigint[];
begin
  select s.grade
    into v_grade
  from public.students s
  where s.id = p_student_id
  for update;

  if not found then
    raise exception 'STUDENT_NOT_FOUND';
  end if;

  select r.id, r.lab_id, r.status
    into v_old_registration_id, v_old_lab_id, v_old_status
  from public.registrations r
  where r.student_id = p_student_id
    and r.status in ('confirmed', 'waiting')
  order by r."timestamp" desc, r.id desc
  limit 1
  for update;

  if not found then
    raise exception 'NO_ACTIVE_REGISTRATION';
  end if;

  if v_old_lab_id = p_new_lab_id then
    raise exception 'SAME_LAB_CHANGE_NOT_ALLOWED';
  end if;

  perform 1
  from public.labs l
  where l.id in (v_old_lab_id, p_new_lab_id)
  order by l.id
  for update;

  select l.group_type, l.capacity
    into v_group_type, v_capacity
  from public.labs l
  where l.id = p_new_lab_id;

  if not found then
    raise exception 'NEW_LAB_NOT_FOUND';
  end if;

  if (v_grade between 1 and 3 and v_group_type <> 'LOW')
     or (v_grade between 4 and 6 and v_group_type <> 'HIGH') then
    raise exception 'GRADE_GROUP_MISMATCH';
  end if;

  update public.registrations
     set status = 'cancelled',
         cancelled_at = v_now,
         updated_at = v_now
   where id = v_old_registration_id;

  if v_old_status = 'confirmed' then
    select p.promoted_count, p.promoted_registration_ids
      into v_promoted_count, v_promoted_ids
    from public.rpc_promote_waiting(v_old_lab_id) p;
  end if;

  select count(*)
    into v_confirmed_count
  from public.registrations r
  where r.lab_id = p_new_lab_id
    and r.status = 'confirmed';

  if v_confirmed_count < v_capacity then
    v_new_status := 'confirmed';
  else
    v_new_status := 'waiting';
  end if;

  insert into public.registrations (
    student_id, lab_id, status, "timestamp", created_at, updated_at
  )
  values (
    p_student_id, p_new_lab_id, v_new_status, v_now, v_now, v_now
  )
  returning id, "timestamp"
    into v_new_registration_id, v_new_timestamp;

  old_registration_id := v_old_registration_id;
  new_registration_id := v_new_registration_id;
  new_lab_id := p_new_lab_id;
  new_status := v_new_status;
  new_timestamp := v_new_timestamp;
  promoted_count := v_promoted_count;
  promoted_registration_ids := v_promoted_ids;
  return next;
end;
$$;

create or replace function public.rpc_admin_get_lab_registrations()
returns table (
  lab_id uuid,
  lab_number smallint,
  group_type text,
  registration_id bigint,
  status text,
  "timestamp" timestamptz(3),
  student_id uuid,
  grade smallint,
  "class" smallint,
  name text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    l.id            as lab_id,
    l.lab_number,
    l.group_type,
    r.id            as registration_id,
    r.status,
    r."timestamp",
    s.id            as student_id,
    s.grade,
    s."class",
    s.name
  from public.registrations r
  join public.labs l    on l.id = r.lab_id
  join public.students s on s.id = r.student_id
  where r.status in ('confirmed', 'waiting')
  order by l.lab_number asc, r.status desc, r."timestamp" asc, r.id asc;
$$;

create or replace function public.rpc_admin_get_students()
returns table (
  id uuid,
  grade smallint,
  "class" smallint,
  name text,
  created_at timestamptz(3),
  registration_status text,
  lab_number smallint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    s.id,
    s.grade,
    s."class",
    s.name,
    s.created_at,
    r.status    as registration_status,
    l.lab_number
  from public.students s
  left join public.registrations r
    on r.student_id = s.id
   and r.status in ('confirmed', 'waiting')
  left join public.labs l on l.id = r.lab_id
  order by s.grade asc, s."class" asc, s.name asc;
$$;

insert into public.labs (group_type, lab_number, capacity)
select groups.group_type, series.lab_number, 15
from (values ('LOW'), ('HIGH')) as groups(group_type)
cross join generate_series(1, 6) as series(lab_number)
on conflict (group_type, lab_number) do nothing;

revoke all on function public.rpc_get_labs_for_group(text) from public;
revoke all on function public.rpc_get_my_registration(uuid) from public;
revoke all on function public.rpc_apply_lab(uuid, uuid) from public;
revoke all on function public.rpc_change_lab(uuid, uuid) from public;
revoke all on function public.rpc_cancel_lab(uuid) from public;
revoke all on function public.rpc_promote_waiting(uuid) from public;

grant execute on function public.rpc_get_labs_for_group(text) to service_role;
grant execute on function public.rpc_get_my_registration(uuid) to service_role;
grant execute on function public.rpc_apply_lab(uuid, uuid) to service_role;
grant execute on function public.rpc_change_lab(uuid, uuid) to service_role;
grant execute on function public.rpc_cancel_lab(uuid) to service_role;
grant execute on function public.rpc_promote_waiting(uuid) to service_role;

revoke all on function public.rpc_admin_get_lab_registrations() from public;
revoke all on function public.rpc_admin_get_students() from public;

grant execute on function public.rpc_admin_get_lab_registrations() to service_role;
grant execute on function public.rpc_admin_get_students() to service_role;

