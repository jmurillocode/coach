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

`.github/workflows/garmin-sync.yml` runs this every 6 hours. **Garmin blocks logins
from CI IPs** (429 / CAPTCHA / 403), so CI uses a saved session token instead of a password:

1. **Generate the token locally** (on your own machine / home internet):
   ```bash
   pip install garminconnect
   python worker/garmin/get_token.py
   ```
   Enter your Garmin email/password (and MFA code if prompted). It prints a base64 token.
2. **Add repo secrets** (Settings → Secrets and variables → Actions):
   - `GARMINTOKENS_BASE64` — the token from step 1
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Trigger the workflow from the **Actions** tab (`Run workflow`). It should log in
   "via saved token" and sync your runs.

The token lasts ~1 year — just re-run `get_token.py` and update the secret if the
Action ever starts failing on auth again.

## Notes & gotchas

- **Login challenges:** if the Action fails auth with 429/CAPTCHA/403, your token expired or was
  never set — re-run `get_token.py` locally and update the `GARMINTOKENS_BASE64` secret. Never rely
  on email/password in CI; Garmin blocks datacenter IPs.
- **It only reads your data**, and writes only to your Supabase. Service-role key stays in secrets.
- **Mapping:** running/cycling/swimming/walking/hiking/strength are normalised; anything else keeps
  Garmin's `typeKey`. Pace is computed from average speed (or distance/duration).
- Dedupe is on `(source, external_id)` so re-runs are safe.
