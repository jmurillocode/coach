-- Coach — Supabase schema (single-user)
-- Run this in the Supabase SQL editor once.
-- This app is single-user and only ever talks to the DB from the server using the
-- service-role key, so Row Level Security is intentionally left OFF. Do NOT expose
-- the service-role key to the browser.

-- ── Athlete profile (single row, id = 1) ───────────────────────────────────
create table if not exists profile (
  id            int primary key default 1,
  name          text,
  dob           date,
  height_cm     numeric,
  weight_kg     numeric,
  max_hr        int,
  resting_hr    int,
  goal          text,            -- free text, e.g. "Chicago Marathon Oct 11 2026, run strong & healthy"
  race_date     date,
  context       jsonb default '{}'::jsonb,  -- anything else the coach should know
  updated_at    timestamptz default now(),
  constraint profile_singleton check (id = 1)
);

-- ── Integration tokens (Whoop, later Garmin) ───────────────────────────────
create table if not exists integrations (
  provider      text primary key,          -- 'whoop' | 'garmin'
  access_token  text,
  refresh_token text,
  expires_at    timestamptz,
  scope         text,
  external_id   text,                       -- whoop user id, etc.
  raw           jsonb default '{}'::jsonb,
  updated_at    timestamptz default now()
);

-- ── Daily metrics (Whoop: recovery / sleep / strain) ───────────────────────
create table if not exists daily_metrics (
  metric_date         date primary key,
  recovery_score      int,         -- 0..100
  hrv_rmssd_ms        numeric,
  resting_hr          int,
  sleep_performance   int,         -- 0..100
  sleep_duration_min  int,
  sleep_need_min      int,
  sleep_efficiency    numeric,
  respiratory_rate    numeric,
  day_strain          numeric,     -- 0..21 Whoop scale
  skin_temp_c         numeric,
  spo2                numeric,
  source              text default 'whoop',
  raw                 jsonb default '{}'::jsonb,
  updated_at          timestamptz default now()
);

-- ── Workouts (Garmin / Whoop workouts) ─────────────────────────────────────
create table if not exists workouts (
  id                  uuid primary key default gen_random_uuid(),
  external_id         text,                 -- garmin/whoop activity id (dedupe)
  source              text default 'garmin',
  sport               text,                 -- 'running' | 'cycling' | 'swimming' | ...
  start_time          timestamptz not null,
  duration_s          int,
  distance_m          numeric,
  avg_pace_s_per_km   numeric,
  avg_hr              int,
  max_hr              int,
  elevation_gain_m    numeric,
  calories            int,
  perceived_effort    int,                  -- optional 1..10 (user)
  splits              jsonb default '[]'::jsonb,
  raw                 jsonb default '{}'::jsonb,
  created_at          timestamptz default now(),
  unique (source, external_id)
);

-- ── Meals (food photo + AI analysis) ───────────────────────────────────────
create table if not exists meals (
  id                  uuid primary key default gen_random_uuid(),
  eaten_at            timestamptz not null default now(),
  meal_type           text,                 -- breakfast/lunch/dinner/snack
  photo_path          text,                 -- storage path
  photo_url           text,                 -- signed/public url (cache)
  ai_items            jsonb default '[]'::jsonb,  -- [{name, portion, calories, protein_g, carbs_g, fat_g}]
  calories_est        int,
  protein_g           numeric,
  carbs_g             numeric,
  fat_g               numeric,
  portion_assessment  text,                 -- 'small' | 'moderate' | 'large' | 'very_large'
  ai_notes            text,                 -- coach-style note on the meal
  user_note           text,
  raw                 jsonb default '{}'::jsonb,
  created_at          timestamptz default now()
);

-- ── Journal entries (subjective check-ins) ─────────────────────────────────
create table if not exists journal_entries (
  id            uuid primary key default gen_random_uuid(),
  entry_at      timestamptz not null default now(),
  mood          int,            -- 1..5
  energy        int,            -- 1..5
  soreness      int,            -- 1..5
  stress        int,            -- 1..5
  body_weight_kg numeric,       -- optional manual weight (Hume scale)
  note          text,
  tags          text[] default '{}',
  created_at    timestamptz default now()
);

-- ── Training plan (the structured skeleton the coach modulates) ────────────
create table if not exists training_plan (
  id                 uuid primary key default gen_random_uuid(),
  day_date           date not null,
  session_type       text,        -- 'easy' | 'long' | 'workout' | 'strength' | 'cross' | 'rest'
  title              text,
  details            jsonb default '{}'::jsonb,
  planned_distance_km numeric,
  planned_duration_min int,
  target_pace        text,        -- e.g. "6:15-6:30/km"
  status             text default 'planned',  -- planned/done/skipped/modified
  actual_workout_id  uuid references workouts(id),
  coach_note         text,
  created_at         timestamptz default now(),
  unique (day_date, session_type)
);

-- ── Coaching briefs (AI output) ────────────────────────────────────────────
create table if not exists coaching_briefs (
  id            uuid primary key default gen_random_uuid(),
  brief_date    date not null,
  kind          text default 'daily',   -- 'daily' | 'weekly'
  title         text,
  body          text,                    -- markdown
  data_snapshot jsonb default '{}'::jsonb,
  model         text,
  created_at    timestamptz default now()
);

create index if not exists idx_workouts_start on workouts (start_time desc);
create index if not exists idx_meals_eaten on meals (eaten_at desc);
create index if not exists idx_journal_entry on journal_entries (entry_at desc);
create index if not exists idx_briefs_date on coaching_briefs (brief_date desc);

-- Seed the single profile row (edit values to taste).
insert into profile (id, name, dob, height_cm, weight_kg, goal, race_date, context)
values (
  1,
  'Jon',
  '1986-07-11',
  180,
  95,
  'Chicago Marathon 2026 — run strong and healthy; rebuild fitness, lose weight, fix durability',
  '2026-10-11',
  '{"failure_mode":"goes out too fast + weak posterior chain -> late-race breakdown","focus":["disciplined easy pace","strength & mobility","portion control"]}'::jsonb
)
on conflict (id) do nothing;
