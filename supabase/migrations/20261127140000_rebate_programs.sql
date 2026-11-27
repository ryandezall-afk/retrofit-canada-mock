-- Active Canadian retrofit rebates, grants, and clean-energy financing programs.
-- Refreshed at most once every 30 days by app/api/cron/sync-rebates using Gemini Google Search Grounding.
--
-- How to run: Supabase dashboard -> SQL Editor -> New query -> paste this whole file -> Run.

-- 1. Track which sync ran in sync_runs (case_studies vs. rebates) -------------------------------
alter table public.sync_runs
  add column if not exists sync_type text not null default 'case_studies'
  check (sync_type in ('case_studies', 'rebates'));

drop index if exists sync_runs_started_at_idx;
create index sync_runs_type_started_at_idx on public.sync_runs (sync_type, started_at desc);

-- 2. Rebate & loan programs table ---------------------------------------------------------------
create table public.rebate_programs (
  slug              text primary key,
  name              text not null,
  level             text not null check (level in ('Federal', 'Provincial', 'Municipal', 'Utility')),
  province          text not null, -- 'ALL' for federal/national programs, or 2-letter code ('AB', 'BC', 'ON', ...)
  city              text,
  summary           text not null,
  estimated_value   text not null,
  eligibility_notes text not null default '',
  eligible_upgrades jsonb not null default '[]',
  url               text not null check (url like 'https://%'),
  source_urls       jsonb not null default '[]',
  status            text not null default 'active' check (status in ('active', 'waitlist', 'closed')),
  content_hash      text not null,
  is_active         boolean not null default true,
  last_verified_at  timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.rebate_programs is
  'Verified residential retrofit grants, rebates, and loans synced monthly via Gemini Search Grounding.';

create index rebate_programs_active_province_idx
  on public.rebate_programs (is_active, province, level);

-- 3. Security (RLS + least-privilege grants) ----------------------------------------------------
alter table public.rebate_programs enable row level security;

revoke all on table public.rebate_programs from anon, authenticated;

grant select on table public.rebate_programs to anon, authenticated;
create policy "Anyone can read active rebate programs"
  on public.rebate_programs
  for select
  to anon, authenticated
  using (is_active);

grant select, insert, update, delete on table public.rebate_programs to service_role;
