-- Coach — nutrition targets + text meal logging (run once after schema.sql)

-- Daily nutrition targets (single row, id = 1).
create table if not exists nutrition_targets (
  id               int primary key default 1,
  daily_kcal       int not null,
  protein_g        int not null,
  carbs_g          int not null,
  fat_g            int not null,
  maintenance_kcal int,
  deficit_kcal     int,
  weekly_loss_kg   numeric,
  rationale        text,
  updated_at       timestamptz default now(),
  constraint nutrition_targets_singleton check (id = 1)
);

alter table nutrition_targets enable row level security;

-- Meals: allow text-based entries (no photo) alongside photo entries.
alter table meals add column if not exists entry_method text default 'photo'; -- 'photo' | 'text'
alter table meals add column if not exists title text;                        -- short label for text entries

-- Seed Jon's targets: ~0.7 kg/week loss while fuelling marathon training.
-- Maintenance ~2950 (95kg, very active in a build); ~650 kcal/day deficit.
-- Protein high to preserve lean mass in a deficit; carbs prioritised around training.
insert into nutrition_targets (id, daily_kcal, protein_g, carbs_g, fat_g, maintenance_kcal, deficit_kcal, weekly_loss_kg, rationale)
values (
  1, 2300, 185, 232, 70, 2950, 650, 0.7,
  'Ambitious-but-reasonable cut: ~0.7 kg/week. Eases as mileage peaks — add ~300-400 kcal (mostly carbs) on long-run and quality days, and do NOT run a deficit the day before a long run. Protein 185g protects lean mass.'
)
on conflict (id) do update set
  daily_kcal = excluded.daily_kcal,
  protein_g = excluded.protein_g,
  carbs_g = excluded.carbs_g,
  fat_g = excluded.fat_g,
  maintenance_kcal = excluded.maintenance_kcal,
  deficit_kcal = excluded.deficit_kcal,
  weekly_loss_kg = excluded.weekly_loss_kg,
  rationale = excluded.rationale,
  updated_at = now();
