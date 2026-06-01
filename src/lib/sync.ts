import { admin } from "./supabase";
import { whoopGet } from "./whoop";

// Whoop API v1 response shapes (partial — only what we use).
type Recovery = {
  created_at: string;
  score?: {
    recovery_score?: number;
    resting_heart_rate?: number;
    hrv_rmssd_milli?: number;
    spo2_percentage?: number;
    skin_temp_celsius?: number;
  };
};
type Sleep = {
  end?: string;
  score?: {
    sleep_performance_percentage?: number;
    sleep_efficiency_percentage?: number;
    respiratory_rate?: number;
    stage_summary?: {
      total_in_bed_time_milli?: number;
      total_awake_time_milli?: number;
    };
    sleep_needed?: {
      baseline_milli?: number;
      need_from_sleep_debt_milli?: number;
      need_from_recent_strain_milli?: number;
    };
  };
};
type Cycle = {
  start?: string;
  score?: { strain?: number };
};
type Workout = {
  id: string | number;
  start: string;
  end?: string;
  sport_id?: number;
  score?: {
    average_heart_rate?: number;
    max_heart_rate?: number;
    kilojoule?: number;
    distance_meter?: number;
    altitude_gain_meter?: number;
  };
};

const day = (iso?: string) => (iso ? iso.slice(0, 10) : null);
const minutes = (milli?: number) =>
  typeof milli === "number" ? Math.round(milli / 60000) : null;

// Map Whoop sport_id → readable name (common ones; extend as needed).
const SPORTS: Record<number, string> = {
  0: "running",
  1: "cycling",
  16: "swimming",
  18: "rowing",
  44: "strength",
  45: "walking",
};

export type SyncResult = {
  days_upserted: number;
  workouts_upserted: number;
  since: string;
};

export async function syncWhoop(daysBack = 14): Promise<SyncResult> {
  const since = new Date(Date.now() - daysBack * 86400_000).toISOString();
  const db = admin();

  const [rec, slp, cyc, wko] = await Promise.all([
    whoopGet<{ records: Recovery[] }>("/v1/recovery", { start: since, limit: "25" }),
    whoopGet<{ records: Sleep[] }>("/v1/activity/sleep", { start: since, limit: "25" }),
    whoopGet<{ records: Cycle[] }>("/v1/cycle", { start: since, limit: "25" }),
    whoopGet<{ records: Workout[] }>("/v1/activity/workout", { start: since, limit: "25" }),
  ]);

  // Merge per-date metrics.
  const byDate = new Map<string, Record<string, unknown>>();
  const touch = (d: string | null) => {
    if (!d) return null;
    if (!byDate.has(d)) byDate.set(d, { metric_date: d, source: "whoop", raw: {} });
    return byDate.get(d)!;
  };

  for (const r of rec.records ?? []) {
    const row = touch(day(r.created_at));
    if (!row || !r.score) continue;
    row.recovery_score = r.score.recovery_score ?? null;
    row.resting_hr = r.score.resting_heart_rate ?? null;
    row.hrv_rmssd_ms = r.score.hrv_rmssd_milli ?? null;
    row.spo2 = r.score.spo2_percentage ?? null;
    row.skin_temp_c = r.score.skin_temp_celsius ?? null;
  }
  for (const s of slp.records ?? []) {
    const row = touch(day(s.end));
    if (!row || !s.score) continue;
    row.sleep_performance = s.score.sleep_performance_percentage ?? null;
    row.sleep_efficiency = s.score.sleep_efficiency_percentage ?? null;
    row.respiratory_rate = s.score.respiratory_rate ?? null;
    const inBed = s.score.stage_summary?.total_in_bed_time_milli;
    const awake = s.score.stage_summary?.total_awake_time_milli ?? 0;
    if (typeof inBed === "number") row.sleep_duration_min = minutes(inBed - awake);
    const need = s.score.sleep_needed;
    if (need) {
      const total =
        (need.baseline_milli ?? 0) +
        (need.need_from_sleep_debt_milli ?? 0) +
        (need.need_from_recent_strain_milli ?? 0);
      row.sleep_need_min = minutes(total);
    }
  }
  for (const c of cyc.records ?? []) {
    const row = touch(day(c.start));
    if (!row || !c.score) continue;
    row.day_strain = c.score.strain ?? null;
  }

  let daysUpserted = 0;
  for (const row of byDate.values()) {
    const { error } = await db
      .from("daily_metrics")
      .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "metric_date" });
    if (!error) daysUpserted++;
  }

  // Workouts.
  let workoutsUpserted = 0;
  for (const w of wko.records ?? []) {
    const dur =
      w.end && w.start
        ? Math.round((new Date(w.end).getTime() - new Date(w.start).getTime()) / 1000)
        : null;
    const dist = w.score?.distance_meter ?? null;
    const pace =
      dist && dur && dist > 0 ? Math.round((dur / (dist / 1000)) * 100) / 100 : null;
    const { error } = await db.from("workouts").upsert(
      {
        external_id: String(w.id),
        source: "whoop",
        sport: SPORTS[w.sport_id ?? -1] ?? "workout",
        start_time: w.start,
        duration_s: dur,
        distance_m: dist,
        avg_pace_s_per_km: pace,
        avg_hr: w.score?.average_heart_rate ?? null,
        max_hr: w.score?.max_heart_rate ?? null,
        elevation_gain_m: w.score?.altitude_gain_meter ?? null,
        calories: w.score?.kilojoule ? Math.round(w.score.kilojoule / 4.184) : null,
        raw: w as unknown as Record<string, unknown>,
      },
      { onConflict: "source,external_id" }
    );
    if (!error) workoutsUpserted++;
  }

  return { days_upserted: daysUpserted, workouts_upserted: workoutsUpserted, since };
}
