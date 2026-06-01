# Coach

A personal, single-user AI training & nutrition coach. Mobile-first PWA.

- **Whoop** → daily recovery, sleep, HRV, resting HR, strain (the readiness layer).
- **Garmin** → workouts/runs (Phase 2 — pace, splits, HR).
- **Food photos** → Claude vision estimates portions & macros (awareness, not precision).
- **Journal** → quick subjective check-ins (mood, energy, soreness, stress, weight).
- **Daily AI brief** → a Vercel cron reads your data and writes a short coaching note, scaling today's session to your recovery.

## Stack

Next.js (App Router, TypeScript) · Tailwind · Supabase (Postgres + Storage) · Anthropic Claude · Vercel (hosting + cron).

## Architecture

```
Whoop API ──┐
Garmin    ──┤→ Postgres (Supabase) ──→ Next.js PWA (dashboard / log)
food photo ─┘                    │
                                 └──→ daily Vercel cron → Claude → coaching_briefs
```

Single-user: the whole app sits behind one passcode (`APP_PASSCODE`). All DB access is
server-side with the Supabase service-role key, so Row Level Security is off by design.

## Quick start

See **SETUP.md** for the full step-by-step. Short version:

```bash
npm install
cp .env.example .env.local   # fill in your keys
# create the Supabase project, run supabase/schema.sql, create the food-photos bucket
npm run dev
```

## Phase roadmap

- **Phase 1 (this repo):** Whoop sync · food-photo analysis · journal · dashboard · daily coach cron.
- **Phase 2:** Garmin workout sync (unofficial `python-garminconnect` worker → Postgres now; official Garmin Connect Developer Program once approved), auto-adjusting plan engine, coaching chat.
- **Phase 3:** trends/charts, web-push notifications, polish.
