import { admin } from "./supabase";
import { getWeeklyVolumeSeries, getWeekStats, mondayOf, type VolumeSeries, type WeekStats } from "./training";
import { getTargets, type NutritionTargets } from "./nutrition";

const RUN_TYPES = ["easy", "long", "workout"];

export function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.APP_PASSCODE
  );
}

export type Dashboard = {
  configured: boolean;
  whoopConnected: boolean;
  latestMetric: any | null;
  brief: any | null;
  todaysMeals: any[];
  macros: { calories: number; protein: number; carbs: number; fat: number };
  upcoming: any[];
  recentWorkouts: any[];
  recentMetrics: any[];
  volume: VolumeSeries;
  weekStats: WeekStats;
  plannedKm: number;
  plannedRunSessions: number;
  todaySessions: any[];
  targets: NutritionTargets;
};

export async function getDashboard(): Promise<Dashboard> {
  const empty: Dashboard = {
    configured: false,
    whoopConnected: false,
    latestMetric: null,
    brief: null,
    todaysMeals: [],
    macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    upcoming: [],
    recentWorkouts: [],
    recentMetrics: [],
    volume: { weeks: [], currentIndex: -1 },
    weekStats: { week_start: mondayOf(), distance_km: 0, duration_min: 0, calories: 0, avg_hr: null, sessions: 0, by_sport: {} },
    plannedKm: 0,
    plannedRunSessions: 0,
    todaySessions: [],
    targets: { daily_kcal: 2300, protein_g: 185, carbs_g: 232, fat_g: 70, maintenance_kcal: 2950, deficit_kcal: 650, weekly_loss_kg: 0.7, start_weight_kg: 96.7, start_date: "2026-06-02", goal_weight_kg: 85, rationale: null },
  };
  if (!isConfigured()) return empty;

  try {
    const db = admin();
    const today = new Date().toISOString().slice(0, 10);
    const startOfDay = `${today}T00:00:00.000Z`;
    const weekStart = mondayOf();
    const weekEndDate = new Date(`${weekStart}T00:00:00.000Z`);
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);
    const weekEnd = weekEndDate.toISOString().slice(0, 10);

    const [metric, brief, meals, plan, whoop, workouts, metrics14, volume, weekStats, targets, weekPlan] =
      await Promise.all([
        db.from("daily_metrics").select("*").order("metric_date", { ascending: false }).limit(1).maybeSingle(),
        db.from("coaching_briefs").select("*").eq("kind", "daily").order("brief_date", { ascending: false }).limit(1).maybeSingle(),
        db.from("meals").select("*").gte("eaten_at", startOfDay).order("eaten_at", { ascending: false }),
        db.from("training_plan").select("*").gte("day_date", today).order("day_date", { ascending: true }).limit(3),
        db.from("integrations").select("provider").eq("provider", "whoop").maybeSingle(),
        db.from("workouts").select("*").order("start_time", { ascending: false }).limit(5),
        db.from("daily_metrics").select("metric_date, recovery_score, hrv_rmssd_ms").order("metric_date", { ascending: false }).limit(14),
        getWeeklyVolumeSeries(),
        getWeekStats(weekStart),
        getTargets(),
        db.from("training_plan").select("day_date, session_type, planned_distance_km, title, target_pace").gte("day_date", weekStart).lte("day_date", weekEnd),
      ]);

    const todaysMeals = meals.data ?? [];
    const macros = todaysMeals.reduce(
      (acc, m) => ({
        calories: acc.calories + (m.calories_est ?? 0),
        protein: acc.protein + Number(m.protein_g ?? 0),
        carbs: acc.carbs + Number(m.carbs_g ?? 0),
        fat: acc.fat + Number(m.fat_g ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    return {
      configured: true,
      whoopConnected: Boolean(whoop.data),
      latestMetric: metric.data ?? null,
      brief: brief.data ?? null,
      todaysMeals,
      macros,
      upcoming: plan.data ?? [],
      recentWorkouts: workouts.data ?? [],
      recentMetrics: (metrics14.data ?? []).slice().reverse(),
      volume,
      weekStats,
      plannedKm: volume.currentIndex >= 0 ? volume.weeks[volume.currentIndex]?.km ?? 0 : 0,
      plannedRunSessions: (weekPlan.data ?? []).filter((r) => RUN_TYPES.includes(r.session_type)).length,
      todaySessions: (weekPlan.data ?? []).filter((r) => r.day_date === today),
      targets,
    };
  } catch {
    return { ...empty, configured: isConfigured() };
  }
}
