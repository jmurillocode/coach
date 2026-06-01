# Coach — setup & deploy

Follow these once. ~30 minutes. You'll need accounts you already have (GitHub, Vercel, Anthropic) plus a free Supabase project and a free Whoop developer app.

## 1. Install & run locally

```bash
cd coach
npm install
cp .env.example .env.local
npm run dev      # http://localhost:3000
```

## 2. Supabase (database + photo storage)

1. Create a project at https://supabase.com → note the **Project URL** and keys (Settings → API).
2. In **SQL Editor**, paste and run `supabase/schema.sql`. This creates all tables and seeds your profile row.
   Then run `supabase/seed_plan_june.sql` to load your 4-week June base block into the plan.
3. In **Storage**, create a **private** bucket named `food-photos`.
4. Fill these in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only — never expose)

## 3. Anthropic

- Put your key in `ANTHROPIC_API_KEY`. `ANTHROPIC_MODEL` defaults to `claude-sonnet-4-6`.

## 4. Whoop developer app

1. Go to https://developer.whoop.com → create an app.
2. Scopes: `read:recovery read:sleep read:workout read:cycles read:profile offline`.
3. Redirect URL: `https://YOUR-DOMAIN/api/whoop/callback` (and `http://localhost:3000/api/whoop/callback` for local).
4. Fill `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, `WHOOP_REDIRECT_URI`.

## 5. App passcode & cron secret

- `APP_PASSCODE` — long random string; this is your login.
- `CRON_SECRET` — long random string; protects the daily cron.
- `NEXT_PUBLIC_APP_URL` — your deployed URL (or `http://localhost:3000`).

## 6. Deploy to Vercel

1. Push to a new GitHub repo (e.g. `jmurillocode/coach`).
2. Import it in Vercel.
3. Add every env var from `.env.local` to the Vercel project (Production + Preview).
4. Deploy. The cron in `vercel.json` runs `/api/cron/coach` daily at 03:30 UTC (≈05:30 Madrid) — it syncs Whoop and writes your morning brief. Vercel automatically sends `Authorization: Bearer $CRON_SECRET`.

## 7. First run

1. Open the app → enter your passcode.
2. Tap **connect Whoop** → authorize. You'll land back on Today.
3. Tap **↻ refresh** on the Coach card to pull Whoop data and generate your first brief.
4. Log a meal photo and a check-in to test those paths.

## Phase 2 — Garmin (ready to enable)

The Garmin worker is already built at `worker/garmin/` with a GitHub Action at
`.github/workflows/garmin-sync.yml`. To turn it on, add four repo secrets — `GARMIN_EMAIL`,
`GARMIN_PASSWORD`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — then run the workflow once from the
Actions tab. It pulls your recent runs into the `workouts` table every 6 hours. Full details and
login-gotchas in `worker/garmin/README.md`. Apply in parallel to the official **Garmin Connect
Developer Program** and migrate to OAuth + webhooks once approved. Do **not** route Strava API data
through the AI (Strava terms).

## Troubleshooting

- **"Setup needed" banner** → env vars missing or schema not run.
- **Whoop connect errors** → redirect URL must match exactly, including scheme and `/api/whoop/callback`.
- **Brief is empty** → make sure `ANTHROPIC_API_KEY` is set and you've synced at least once.
