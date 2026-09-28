-- V13.0 · Módulo Simulados
-- Aplicado no projeto Supabase hapyzjfhbobtaellaejv em 2026-09-28.
-- Mantido no repositório para reprodução/auditoria.

begin;

create table if not exists public.simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  code text not null,
  title text not null,
  subtitle text not null default '',
  version text not null default '',
  board text not null default '',
  question_count integer not null default 0 check (question_count >= 0),
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  filename text not null,
  storage_path text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint simulations_course_fkey
    foreign key (user_id, course_id)
    references public.courses(user_id, id)
    on delete cascade,
  constraint simulations_user_course_code_key
    unique(user_id, course_id, code)
);

create index if not exists simulations_user_created_idx
  on public.simulations(user_id, created_at desc);

create index if not exists simulations_user_course_idx
  on public.simulations(user_id, course_id);

alter table public.simulations enable row level security;

revoke all on table public.simulations from anon, authenticated;
grant select, insert, update, delete on table public.simulations to authenticated;

drop policy if exists simulations_select_own on public.simulations;
create policy simulations_select_own on public.simulations
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists simulations_insert_own on public.simulations;
create policy simulations_insert_own on public.simulations
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists simulations_update_own on public.simulations;
create policy simulations_update_own on public.simulations
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists simulations_delete_own on public.simulations;
create policy simulations_delete_own on public.simulations
  for delete to authenticated
  using ((select auth.uid()) = user_id);

commit;
