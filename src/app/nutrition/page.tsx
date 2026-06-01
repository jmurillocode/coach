import { getDayNutrition } from "@/lib/nutrition";
import { isConfigured } from "@/lib/data";
import { MealLogger } from "@/components/MealLogger";

export const dynamic = "force-dynamic";

function Bar({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const over = value > target;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className={over ? "text-warn" : ""}>{Math.round(value)}/{target}{unit}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-edge">
        <div className={`h-full ${over ? "bg-warn" : "bg-accent"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function Nutrition() {
  if (!isConfigured()) {
    return (
      <main className="px-4 pt-6">
        <h1 className="text-2xl font-semibold">Nutrition</h1>
        <p className="mt-4 text-sm text-muted">Configure the app first (see SETUP.md).</p>
      </main>
    );
  }

  const n = await getDayNutrition();
  const t = n.targets;
  const kcalPct = Math.min(100, Math.round((n.consumed.kcal / t.daily_kcal) * 100));
  const remaining = n.remaining_kcal;

  return (
    <main className="space-y-4 px-4 pt-6">
      <header>
        <h1 className="text-2xl font-semibold">Nutrition</h1>
        <p className="text-sm text-muted">Target {t.daily_kcal} kcal · ~{t.weekly_loss_kg}kg/wk goal</p>
      </header>

      {/* Calorie target */}
      <section className="card">
        <div className="flex items-end justify-between">
          <div>
            <p className="label">Consumed today</p>
            <p className="text-4xl font-bold">
              {Math.round(n.consumed.kcal)}
              <span className="ml-1 text-base font-normal text-muted">/ {t.daily_kcal} kcal</span>
            </p>
          </div>
          <div className="text-right">
            <p className="label">{remaining >= 0 ? "Remaining" : "Over"}</p>
            <p className={`text-2xl font-semibold ${remaining < 0 ? "text-warn" : "text-accent"}`}>{Math.abs(remaining)}</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-edge">
          <div className={`h-full ${n.consumed.kcal > t.daily_kcal ? "bg-warn" : "bg-accent"}`} style={{ width: `${kcalPct}%` }} />
        </div>
        <div className="mt-4 space-y-3">
          <Bar label="Protein" value={n.consumed.protein} target={t.protein_g} unit="g" />
          <Bar label="Carbs" value={n.consumed.carbs} target={t.carbs_g} unit="g" />
          <Bar label="Fat" value={n.consumed.fat} target={t.fat_g} unit="g" />
        </div>
        {t.rationale && <p className="mt-3 border-t border-edge pt-3 text-xs text-muted">{t.rationale}</p>}
      </section>

      {/* Logger */}
      <section className="card">
        <p className="label mb-3">Log a meal</p>
        <MealLogger />
      </section>

      {/* Today's meals */}
      <section className="card">
        <p className="label mb-3">Today&apos;s meals</p>
        {n.meals.length === 0 ? (
          <p className="text-sm text-muted">Nothing logged yet.</p>
        ) : (
          <ul className="space-y-3">
            {n.meals.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                {m.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photo_url} alt="" className="h-11 w-11 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-edge text-muted">✎</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{m.title ?? m.ai_items?.[0]?.name ?? m.meal_type ?? "Meal"}</p>
                  <p className="text-xs text-muted">
                    {m.calories_est ?? "?"} kcal · {Math.round(m.protein_g ?? 0)}g P · portion {m.portion_assessment ?? "—"}
                  </p>
                </div>
                <span className="text-xs text-muted">{new Date(m.eaten_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
