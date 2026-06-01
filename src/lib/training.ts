import { admin } from "./supabase";

export function mondayOf(d = new Date()): string {
  const date = new Date(d);
  const day = (date.getUTCDay() + 6) % 7; // 0 = Monday
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
}

export type WeekStats = {
  week_start: string;
  distance_km: number;
  duration_min: number;
  calories: number;
  avg_hr: number | null;
  sessions: number;
  by_sport: Record<string, { km: number; count: number }>;
};

export async function getWeekStats(weekStartISO?: string): Promise<WeekStats> {
  const start = weekStartISO ?? mondayOf();
  const startTs = `${start}T00:00:00.000Z`;
  const endDate = new Date(`${start}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 7);
  const { data } = await admin()
    .from("workouts")
    .select("sport, distance_m, duration_s, calories, avg_hr, start_time")
    .gte("start_time", startTs)
    .lt("start_time", endDate.toISOString());

  const w = data ?? [];
  let distance = 0,
    duration = 0,
    calories = 0,
    hrNum = 0,
    hrDen = 0;
  const bySport: Record<string, { km: number; count: number }> = {};
  for (const x of w) {
    distance += Number(x.distance_m ?? 0);
    duration += Number(x.duration_s ?? 0);
    calories += Number(x.calories ?? 0);
    if (x.avg_hr && x.duration_s) {
      hrNum += Number(x.avg_hr) * Number(x.duration_s);
      hrDen += Number(x.duration_s);
    }
    const sp = x.sport ?? "other";
    bySport[sp] ??= { km: 0, count: 0 };
    bySport[sp].km += Number(x.distance_m ?? 0) / 1000;
    bySport[sp].count += 1;
  }
  return {
    week_start: start,
    distance_km: Math.round((distance / 1000) * 10) / 10,
    duration_min: Math.round(duration / 60),
    calories: Math.round(calories),
    avg_hr: hrDen ? Math.round(hrNum / hrDen) : null,
    sessions: w.length,
    by_sport: bySport,
  };
}

export async function getTodayNext() {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
  const { data } = await admin()
    .from("training_plan")
    .select("*")
    .in("day_date", [today, tomorrow])
    .order("day_date", { ascending: true });
  const rows = data ?? [];
  return {
    today: rows.filter((r) => r.day_date === today),
    tomorrow: rows.filter((r) => r.day_date === tomorrow),
  };
}

export type VolumeSeries = { weeks: { week_start: string; km: number }[]; currentIndex: number };

// Planned weekly volume across the whole plan (the build "arc").
export async function getWeeklyVolumeSeries(): Promise<VolumeSeries> {
  const { data } = await admin()
    .from("training_plan")
    .select("day_date, planned_distance_km")
    .order("day_date", { ascending: true });
  const byWeek = new Map<string, number>();
  for (const r of data ?? []) {
    if (!r.planned_distance_km) continue;
    const wk = mondayOf(new Date(`${r.day_date}T00:00:00.000Z`));
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + Number(r.planned_distance_km));
  }
  const weeks = [...byWeek.entries()]
    .map(([week_start, km]) => ({ week_start, km: Math.round(km) }))
    .sort((a, b) => a.week_start.localeCompare(b.week_start));
  const cur = mondayOf();
  const currentIndex = weeks.findIndex((w) => w.week_start === cur);
  return { weeks, currentIndex };
}

export async function getWeekPlan(weekStartISO?: string) {
  const start = weekStartISO ?? mondayOf();
  const endDate = new Date(`${start}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  const end = endDate.toISOString().slice(0, 10);
  const { data } = await admin()
    .from("training_plan")
    .select("*")
    .gte("day_date", start)
    .lte("day_date", end)
    .order("day_date", { ascending: true });
  return data ?? [];
}
