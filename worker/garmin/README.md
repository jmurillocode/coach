# Garmin sync worker (Phase 2)

Pulls your recent Garmin activities and upserts them into the `workouts` table in Supabase.
Standalone — runs independently of the Next.js app.

## Why this exists

Garmin is your **workout** source (you wear it to run). Whoop stays your recovery/sleep source.
We pull runs directly from Garmin rather than Strava, which also avoids Strava's "no AI" API terms.

This uses the **unofficial** `garminconnect` library with your own login — the zero-wait path.
In parallel, apply to the official **Garmin Connect Developer Program** (OAuth + webhooks); migrate
to it when approved and retire this worker.

## Run locally

```bash
cd worker/garmin
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export GARMIN_EMAIL="you@example.com"
export GARMIN_PASSWORD="..."
export SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="..."
python sync.py
```

## Run on a schedule (GitHub Action)

`.github/workflows/garmin-sync.yml` runs this every 6 hours. Add these repo secrets
(Settings → Secrets and variables → Actions):

- `GARMIN_EMAIL`
- `GARMIN_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Trigger it manually the first time from the Actions tab (`Run workflow`).

## Notes & gotchas

- **Login challenges:** Garmin occasionally requires MFA/verification from new IPs (like GitHub's
  runners). If a scheduled run fails on login, run `sync.py` once locally to clear the challenge, or
  switch to token auth (dump a `garth` session and load it) — the `garminconnect` README shows how.
- **It only reads your data**, and writes only to your Supabase. Service-role key stays in secrets.
- **Mapping:** running/cycling/swimming/walking/hiking/strength are normalised; anything else keeps
  Garmin's `typeKey`. Pace is computed from average speed (or distance/duration).
- Dedupe is on `(source, external_id)` so re-runs are safe.
