import { admin } from "./supabase";

export type NutritionTargets = {
  daily_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  maintenance_kcal: number | null;
  deficit_kcal: number | null;
  weekly_loss_kg: number | null;
  start_weight_kg: number | null;
  start_date: string | null;
  goal_weight_kg: number | null;
  rationale: string | null;
};

const DEFAULT_TARGETS: NutritionTargets = {
  daily_kcal: 2300,
  protein_g: 185,
  carbs_g: 232,
  fat_g: 70,
  maintenance_kcal: 2950,
  deficit_kcal: 650,
  weekly_loss_kg: 0.7,
  start_weight_kg: 95,
  start_date: "2026-06-01",
  goal_weight_kg: 85,
  rationale: null,
};

const RACE_DATE = "2026-10-11";

export async function getTargets(): Promise<NutritionTargets> {
  const { data } = await admin().from("nutrition_targets").select("*").eq("id", 1).maybeSingle();
  return (data as NutritionTargets) ?? DEFAULT_TARGETS;
}

export type DayNutrition = {
  date: string;
  consumed: { kcal: number; protein: number; carbs: number; fat: number };
  meals: any[];
  targets: NutritionTargets;
  remaining_kcal: number;
};

export async function getDayNutrition(date?: string): Promise<DayNutrition> {
  const day = date ?? new Date().toISOString().slice(0, 10);
  const start = `${day}T00:00:00.000Z`;
  const end = `${day}T23:59:59.999Z`;
  const [targets, mealsRes] = await Promise.all([
    getTargets(),
    admin()
      .from("meals")
      .select("*")
      .gte("eaten_at", start)
      .lte("eaten_at", end)
      .order("eaten_at", { ascending: false }),
  ]);
  const meals = mealsRes.data ?? [];
  const consumed = meals.reduce(
    (a, m) => ({
      kcal: a.kcal + (m.calories_est ?? 0),
      protein: a.protein + Number(m.protein_g ?? 0),
      carbs: a.carbs + Number(m.carbs_g ?? 0),
      fat: a.fat + Number(m.fat_g ?? 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );
  return {
    date: day,
    consumed,
    meals,
    targets,
    remaining_kcal: Math.round(targets.daily_kcal - consumed.kcal),
  };
}

export type WeightProgress = {
  series: { date: string; kg: number }[];
  goalStart: { date: string; kg: number };
  goalEnd: { date: string; kg: number };
  targetTodayKg: number;
  latest: { date: string; kg: number } | null;
  deltaVsTargetKg: number | null; // latest - target (negative = ahead of plan)
  startKg: number;
  goalKg: number;
  rate: number;
};

export async function getWeightProgress(): Promise<WeightProgress> {
  const targets = await getTargets();
  const startKg = targets.start_weight_kg ?? 95;
  const startDate = targets.start_date ?? "2026-06-01";
  const rate = targets.weekly_loss_kg ?? 0.7;
  const goalKg = targets.goal_weight_kg ?? Math.round((startKg - rate * 15) * 10) / 10;

  const { data } = await admin()
    .from("journal_entries")
    .select("entry_at, body_weight_kg")
    .not("body_weight_kg", "is", null)
    .order("entry_at", { ascending: true });

  const series = (data ?? []).map((r) => ({ date: r.entry_at.slice(0, 10), kg: Number(r.body_weight_kg) }));

  const weeksElapsed = Math.max(0, (Date.now() - new Date(startDate).getTime()) / (7 * 86400_000));
  const targetTodayKg = Math.max(goalKg, Math.round((startKg - rate * weeksElapsed) * 10) / 10);
  const latest = series.length ? series[series.length - 1] : null;
  const deltaVsTargetKg = latest ? Math.round((latest.kg - targetTodayKg) * 10) / 10 : null;

  return {
    series,
    goalStart: { date: startDate, kg: startKg },
    goalEnd: { date: RACE_DATE, kg: goalKg },
    targetTodayKg,
    latest,
    deltaVsTargetKg,
    startKg,
    goalKg,
    rate,
  };
}
