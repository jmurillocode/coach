-- Coach — June 2026 base/reset block (4 weeks) for Jon.
-- Philosophy: rebuild aerobic base with DISCIPLINED easy running (HR-capped, not pace-ego),
-- add the missing strength & mobility, use bike/pool cross-training to add aerobic load with
-- low injury risk, and keep one true rest day. This is the skeleton the AI coach modulates
-- against daily Whoop recovery. Idempotent — safe to re-run.
--
-- Easy-run guidance: keep HR ~135-142 bpm even if that means 6:15-6:30/km. Strength = bodyweight
-- + bands, no gym. Long runs stay conversational. Run it slow; earn the speed in July.

insert into training_plan (day_date, session_type, title, planned_distance_km, planned_duration_min, target_pace, details, coach_note)
values
  -- ── Week 1 (Jun 1-7): ~35 km, settle the routine ──────────────────────────
  ('2026-06-01','easy','Easy run',6,40,'6:15-6:30/km','{"hr_cap":142}','Keep it genuinely easy — this is base, not a test.'),
  ('2026-06-02','easy','Easy run',7,46,'6:15-6:30/km','{"hr_cap":142}',null),
  ('2026-06-02','strength','Strength A — posterior chain & core',null,30,null,'{"exercises":["Glute bridges 3x12","Single-leg RDL (bodyweight) 3x8/side","Calf raises 3x15","Side plank 3x30s/side","Dead bug 3x10"]}','Slow, controlled reps. This is the durability work that fixes your injury pattern.'),
  ('2026-06-03','cross','Easy spin (bike)',null,55,null,'{"intensity":"zone 2, conversational"}','Aerobic volume with zero impact — leverage your bike background.'),
  ('2026-06-04','easy','Easy run + mobility',7,46,'6:15-6:30/km','{"hr_cap":142,"mobility_min":10}',null),
  ('2026-06-05','strength','Strength B — hips, calves & feet',null,30,null,'{"exercises":["Step-ups 3x10/side","Banded clamshells 3x15/side","Eccentric calf raises 3x12","Wall sit 3x40s","Bird dog 3x10/side"]}',null),
  ('2026-06-05','easy','Optional shakeout',5,33,'6:20-6:35/km','{"optional":true,"hr_cap":140}','Skip if legs feel heavy — recovery beats junk miles.'),
  ('2026-06-06','long','Long easy run',10,68,'6:20-6:40/km','{"hr_cap":145,"fuel":"easy, can be fasted if comfortable"}','Conversational the whole way. If you can''t chat, slow down.'),
  ('2026-06-07','rest','Rest / optional easy swim',null,null,null,'{"optional_swim_min":30}','Full rest or an easy float. Let the week absorb.'),

  -- ── Week 2 (Jun 8-14): ~44 km, nudge volume ───────────────────────────────
  ('2026-06-08','rest','Rest or easy 5k',5,33,'6:20-6:35/km','{"optional":true}','Default to rest if Whoop recovery is amber/red.'),
  ('2026-06-09','easy','Easy run',8,52,'6:10-6:30/km','{"hr_cap":143}',null),
  ('2026-06-09','strength','Strength A — posterior chain & core',null,30,null,'{"progress":"add 1 set to bridges & RDL"}',null),
  ('2026-06-10','cross','Bike or swim',null,60,null,'{"intensity":"zone 2"}',null),
  ('2026-06-11','easy','Easy run',8,52,'6:10-6:30/km','{"hr_cap":143}',null),
  ('2026-06-12','strength','Strength B — hips, calves & feet',null,30,null,'{}',null),
  ('2026-06-12','easy','Optional shakeout',5,33,'6:20-6:35/km','{"optional":true}',null),
  ('2026-06-13','long','Long easy run',12,82,'6:20-6:40/km','{"hr_cap":146}','Two km longer than last week — same easy effort.'),
  ('2026-06-14','easy','Easy run or swim',6,40,'6:20-6:35/km','{"swim_alt_min":30}',null),

  -- ── Week 3 (Jun 15-21): ~50 km, add light strides ─────────────────────────
  ('2026-06-15','rest','Rest',null,null,null,'{}','Protect this day — biggest volume week of the block.'),
  ('2026-06-16','easy','Easy run + strides',9,58,'6:10-6:25/km','{"hr_cap":143,"strides":"6x20s relaxed, full recovery"}','Strides are smooth and fast-feet, not a sprint — neuromuscular, not anaerobic.'),
  ('2026-06-16','strength','Strength A — posterior chain & core',null,30,null,'{}',null),
  ('2026-06-17','cross','Bike',null,70,null,'{"intensity":"zone 2, optional 4x3min tempo if fresh"}',null),
  ('2026-06-18','easy','Easy run',9,58,'6:10-6:25/km','{"hr_cap":143}',null),
  ('2026-06-19','strength','Strength B — hips, calves & feet',null,30,null,'{}',null),
  ('2026-06-19','easy','Optional shakeout',6,40,'6:20-6:35/km','{"optional":true}',null),
  ('2026-06-20','long','Long easy run',14,96,'6:20-6:40/km','{"hr_cap":147}','Longest of the block. Negative-split the effort if you feel good late.'),
  ('2026-06-21','easy','Easy run',7,46,'6:20-6:35/km','{}',null),

  -- ── Week 4 (Jun 22-28): cutback ~38 km, absorb & prep July build ──────────
  ('2026-06-22','rest','Rest',null,null,null,'{}',null),
  ('2026-06-23','easy','Easy run',7,46,'6:10-6:25/km','{"hr_cap":143}','Recovery week — volume drops, let the adaptations land.'),
  ('2026-06-23','strength','Strength A — lighter',null,25,null,'{"note":"reduce one set across the board"}',null),
  ('2026-06-24','cross','Easy spin',null,45,null,'{"intensity":"zone 2 only"}',null),
  ('2026-06-25','easy','Easy run + strides',8,52,'6:10-6:25/km','{"strides":"5x20s"}',null),
  ('2026-06-26','strength','Strength B — lighter',null,25,null,'{}',null),
  ('2026-06-26','easy','Optional shakeout',5,33,'6:20-6:35/km','{"optional":true}',null),
  ('2026-06-27','long','Long easy run',12,82,'6:20-6:40/km','{"hr_cap":146}','Slightly shorter — you''re recharging for the marathon build that starts in July.'),
  ('2026-06-28','rest','Rest / swim',null,null,null,'{"optional_swim_min":30}','End of the base block. Next: 15-week Chicago build.')
on conflict (day_date, session_type) do update set
  title = excluded.title,
  planned_distance_km = excluded.planned_distance_km,
  planned_duration_min = excluded.planned_duration_min,
  target_pace = excluded.target_pace,
  details = excluded.details,
  coach_note = excluded.coach_note;
