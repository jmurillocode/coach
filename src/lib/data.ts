import { admin } from "./supabase";

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
  };
  if (!isConfigured()) return empty;

  try {
    const db = admin();
    const today = new Date().toISOString().slice(0, 10);
    const startOfDay = `${today}T00:00:00.000Z`;

    const [metric, brief, meals, plan, whoop, workouts] = await Promise.all([
      db.from("daily_metrics").select("*").order("metric_date", { ascending: false }).limit(1).maybeSingle(),
      db.from("coaching_briefs").select("*").eq("kind", "daily").order("brief_date", { ascending: false }).limit(1).maybeSingle(),
      db.from("meals").select("*").gte("eaten_at", startOfDay).order("eaten_at", { ascending: false }),
      db.from("training_plan").select("*").gte("day_date", today).order("day_date", { ascending: true }).limit(3),
      db.from("integrations").select("provider").eq("provider", "whoop").maybeSingle(),
      db.from("workouts").select("*").order("start_time", { ascending: false }).limit(5),
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
    };
  } catch {
    return { ...empty, configured: isConfigured() };
  }
}
