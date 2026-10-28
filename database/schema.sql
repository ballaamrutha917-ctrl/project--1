-- Campus Compliment and Grievance Management System
-- Run this script in Supabase Dashboard -> SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null check (char_length(trim(name)) between 2 and 100),
  email varchar(254) not null unique,
  password_hash text not null,
  role text not null default 'student' check (role in ('student','admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  type text not null check (type in ('compliment','grievance')),
  title varchar(120) not null check (char_length(trim(title)) between 3 and 120),
  category text not null check (category in (
    'Faculty & Teaching','Facilities & Maintenance','Library','Hostel',
    'Cleanliness','Safety & Security','Transport','Administration','Other'
  )),
  description varchar(3000) not null check (char_length(trim(description)) between 10 and 3000),
  status text not null default 'submitted' check (status in ('submitted','under_review','in_progress','resolved','rejected')),
  admin_note varchar(1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists submissions_user_created_idx on public.submissions(user_id, created_at desc);
create index if not exists submissions_status_idx on public.submissions(status);
create index if not exists submissions_type_idx on public.submissions(type);
create index if not exists submissions_created_idx on public.submissions(created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists submissions_set_updated_at on public.submissions;
create trigger submissions_set_updated_at before update on public.submissions
for each row execute function public.set_updated_at();

-- All data access in this student MVP goes through the Express server.
-- The service-role key must remain server-side. These policies block direct
-- access through public/anon Supabase clients. The server's service role bypasses RLS,
-- so every private route MUST enforce authorization in backend code.
alter table public.users enable row level security;
alter table public.submissions enable row level security;

-- No policies are intentionally created for anon/authenticated roles.
-- Never put SUPABASE_SERVICE_ROLE_KEY in frontend files or GitHub.
