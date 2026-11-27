-- Retrofit Canada case studies, copied from https://portal.retrofitcanada.com/api/v1
-- The sync (app/api/cron/sync-case-studies) refreshes this table at most once every 30 days.
--
-- How to run: Supabase dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
-- Safe to run once per project. It creates two tables:
--   case_studies  one row per published case study (readable by the website)
--   sync_runs     a log of every sync (only the server's secret key can see it)

-- 1. Case studies -------------------------------------------------------------------------------
create table public.case_studies (
  -- Retrofit Canada's own id for the case study (for example 47 = hat-coat-boot)
  id                 integer primary key,
  slug               text not null unique,          -- urlSlug, used in our page URLs
  name               text not null,                 -- caseStudyName
  intro              text,                          -- introDescription (short summary)
  image_url          text,                          -- featured image
  publish_date       date,

  -- Readable columns for the list page, the filters and the advisor's matching
  province           text,
  city               text,
  house_type         text,
  year_built         integer,
  foundation_type    text,
  structure_type     text,
  climate_zone       text,
  retrofit_type      text,
  retrofit_phasing   text,
  performance_level  text,
  team               jsonb not null default '[]',   -- [{ "name", "role", "url" }]
  before_gj          numeric,                       -- total annual energy use before (GJ)
  after_gj           numeric,                       -- total annual energy use after (GJ)
  energy_savings_pct numeric,                       -- annual energy savings incl. renewables (%)
  lessons_learned    text,

  -- The full record exactly as the API returned it. The detail page is built from this,
  -- so a new field from Retrofit Canada never needs a database change.
  raw                jsonb not null,
  content_hash       text not null,                 -- fingerprint of raw, to spot real changes

  is_active          boolean not null default true, -- false once the API stops listing it
  first_synced_at    timestamptz not null default now(),
  updated_at         timestamptz not null default now(),  -- last time the content changed
  last_seen_at       timestamptz not null default now()   -- last sync that returned it
);

comment on table public.case_studies is
  'Published Retrofit Canada case studies, copied from their public API by the monthly sync.';

create index case_studies_active_name_idx on public.case_studies (is_active, name);

-- 2. Sync log -----------------------------------------------------------------------------------
create table public.sync_runs (
  id           bigint generated always as identity primary key,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  status       text not null default 'running' check (status in ('running', 'success', 'failed')),
  trigger      text not null default 'cron' check (trigger in ('cron', 'manual')),
  fetched      integer,   -- case studies returned by the API
  inserted     integer,   -- new ones
  updated      integer,   -- content changed
  unchanged    integer,
  deactivated  integer,   -- no longer returned by the API
  error        text
);

comment on table public.sync_runs is 'One row per case-study sync, newest first by started_at.';

create index sync_runs_started_at_idx on public.sync_runs (started_at desc);

-- 3. Security -----------------------------------------------------------------------------------
-- Row Level Security on both tables. With RLS on, a role sees only what a policy allows.
alter table public.case_studies enable row level security;
alter table public.sync_runs enable row level security;

-- Start from nothing for the public roles...
revoke all on table public.case_studies, public.sync_runs from anon, authenticated;

-- ...then let the website (publishable key = role anon) read published case studies only.
-- The data is already public on retrofitcanada.com, so reading it with the public key is fine.
grant select on table public.case_studies to anon, authenticated;
create policy "Anyone can read published case studies"
  on public.case_studies
  for select
  to anon, authenticated
  using (is_active);

-- The sync uses the secret key (role service_role), which bypasses RLS. New Supabase projects
-- (since 30 May 2026) don't grant table access automatically, so grant it explicitly.
grant select, insert, update, delete on table public.case_studies, public.sync_runs to service_role;
grant usage, select on sequence public.sync_runs_id_seq to service_role;
