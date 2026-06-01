import { admin } from "./supabase";

export type NutritionTargets = {
  daily_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  maintenance_kcal: number | null;
  deficit_kcal: number | null;
  weekly_loss_kg: number | null;
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
  rationale: null,
};

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
