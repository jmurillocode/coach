#!/usr/bin/env python3
"""
Garmin -> Supabase workout sync (Coach, Phase 2).

Logs into your own Garmin Connect account with the unofficial `garminconnect`
library, pulls recent activities, and upserts them into the `workouts` table via
the Supabase REST API. Run on a schedule (GitHub Action / cron / your Mac).

This reads only YOUR data. It does NOT touch Strava (Strava's API terms forbid
feeding their data to AI). Migrate to the official Garmin Connect Developer
Program later for an OAuth + webhook path; this worker is the zero-wait stopgap.

Env required:
  GARMIN_EMAIL, GARMIN_PASSWORD
  SUPABASE_URL                  e.g. https://xxxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY
Optional:
  GARMIN_LOOKBACK   number of recent activities to scan (default 20)
"""
import os
import sys
import json
import datetime as dt
from typing import Any, Optional

import requests

try:
    from garminconnect import Garmin
except ImportError:
    sys.exit("Missing dependency: pip install garminconnect")


SPORT_MAP = {
    "running": "running",
    "trail_running": "running",
    "treadmill_running": "running",
    "track_running": "running",
    "cycling": "cycling",
    "road_biking": "cycling",
    "mountain_biking": "cycling",
    "indoor_cycling": "cycling",
    "virtual_ride": "cycling",
    "lap_swimming": "swimming",
    "open_water_swimming": "swimming",
    "walking": "walking",
    "hiking": "hiking",
    "strength_training": "strength",
}


def env(name: str, required: bool = True, default: Optional[str] = None) -> Optional[str]:
    v = os.environ.get(name, default)
    if required and not v:
        sys.exit(f"Missing env var: {name}")
    return v


def to_iso(value: Any) -> Optional[str]:
    """Garmin gives 'YYYY-MM-DD HH:MM:SS' in GMT. Return ISO8601 Z."""
    if not value:
        return None
    if isinstance(value, str):
        try:
            d = dt.datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
            return d.replace(tzinfo=dt.timezone.utc).isoformat()
        except ValueError:
            return value
    return None


def num(v: Any) -> Optional[float]:
    try:
        return round(float(v), 3) if v is not None else None
    except (TypeError, ValueError):
        return None


def map_activity(a: dict) -> Optional[dict]:
    type_key = (a.get("activityType") or {}).get("typeKey", "")
    sport = SPORT_MAP.get(type_key, type_key or "workout")

    distance_m = num(a.get("distance"))
    duration_s = num(a.get("duration"))
    avg_speed = num(a.get("averageSpeed"))  # m/s
    pace = None
    if avg_speed and avg_speed > 0:
        pace = round(1000.0 / avg_speed, 2)
    elif distance_m and duration_s and distance_m > 0:
        pace = round(duration_s / (distance_m / 1000.0), 2)

    start = to_iso(a.get("startTimeGMT"))
    if not start:
        return None

    return {
        "external_id": str(a.get("activityId")),
        "source": "garmin",
        "sport": sport,
        "start_time": start,
        "duration_s": int(duration_s) if duration_s else None,
        "distance_m": distance_m,
        "avg_pace_s_per_km": pace,
        "avg_hr": int(a["averageHR"]) if a.get("averageHR") else None,
        "max_hr": int(a["maxHR"]) if a.get("maxHR") else None,
        "elevation_gain_m": num(a.get("elevationGain")),
        "calories": int(a["calories"]) if a.get("calories") else None,
        "raw": a,
    }


def upsert(rows: list[dict]) -> None:
    if not rows:
        print("No activities to upsert.")
        return
    url = env("SUPABASE_URL").rstrip("/") + "/rest/v1/workouts?on_conflict=source,external_id"
    key = env("SUPABASE_SERVICE_ROLE_KEY")
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    resp = requests.post(url, headers=headers, data=json.dumps(rows), timeout=30)
    if resp.status_code >= 300:
        sys.exit(f"Supabase upsert failed {resp.status_code}: {resp.text}")
    print(f"Upserted {len(rows)} workouts.")


def main() -> None:
    lookback = int(env("GARMIN_LOOKBACK", required=False, default="20"))

    # Prefer a saved session token (required in CI — Garmin blocks datacenter-IP
    # logins with 429/CAPTCHA). Generate it locally with get_token.py.
    tokens = os.environ.get("GARMINTOKENS_BASE64", "").strip()
    if tokens:
        import io
        import base64
        import tarfile
        import tempfile

        store = tempfile.mkdtemp()
        with tarfile.open(fileobj=io.BytesIO(base64.b64decode(tokens)), mode="r:gz") as tar:
            try:
                tar.extractall(store, filter="data")  # py>=3.12
            except TypeError:
                tar.extractall(store)
        client = Garmin()
        client.login(store)
        print("Logged in via saved token.")
    else:
        client = Garmin(env("GARMIN_EMAIL"), env("GARMIN_PASSWORD"))
        client.login()
        print("Logged in via email/password (works locally, not from CI).")

    activities = client.get_activities(0, lookback)
    print(f"Fetched {len(activities)} activities from Garmin.")

    rows = [r for a in activities if (r := map_activity(a))]
    upsert(rows)


if __name__ == "__main__":
    main()
