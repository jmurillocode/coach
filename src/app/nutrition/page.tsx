import Link from "next/link";
import { getDayNutrition, getWeightProgress } from "@/lib/nutrition";
import { isConfigured } from "@/lib/data";
import { MealLogger } from "@/components/MealLogger";
import { Gauge, ProgressBar, WeightTrend } from "@/components/charts";

export const dynamic = "force-dynamic";

export default async function Nutrition() {
  if (!isConfigured()) {
    return (
      <main className="px-4 pt-6">
        <h1 className="text-2xl font-semibold">Nutrition</h1>
        <p className="mt-4 text-sm text-muted">Configure the app first (see SETUP.md).</p>
      </main>
    );
  }

  const [n, wp] = await Promise.all([getDayNutrition(), getWeightProgress()]);
  const t = n.targets;
  const over = n.consumed.kcal > t.daily_kcal;

  return (
    <main className="space-y-3 px-4 pt-6">
      <header>
        <h1 className="text-2xl font-semibold">Nutrition</h1>
        <p className="mlab mt-0.5">target {t.daily_kcal.toLocaleString()} kcal · ~{t.weekly_loss_kg}kg/wk</p>
      </header>

      {/* Calorie ring */}
      <section className="card flex items-center gap-5">
        <Gauge
          value={n.consumed.kcal}
          max={t.daily_kcal}
          display={`${Math.round(n.consumed.kcal)}`}
          sub={`/ ${t.daily_kcal}`}
          color={over ? "#F5B544" : "#46E5A0"}
          numColor="#E8EDF2"
          size={108}
        />
        <div className="flex-1">
          <div className="mlab">{n.remaining_kcal >= 0 ? "remaining" : "over"}</div>
          <div className="num text-3xl" style={{ color: over ? "#F5B544" : "#46E5A0" }}>{Math.abs(n.remaining_kcal).toLocaleString()}</div>
          <div className="mt-1 text-xs text-muted">{over ? "above target today" : "kcal left today"}</div>
        </div>
      </section>

      {/* Macros */}
      <section className="card space-y-3">
        <span className="mlab">Macros</span>
        <ProgressBar label="protein" value={n.consumed.protein} target={t.protein_g} color="#4FD3E0" />
        <ProgressBar label="carbs" value={n.consumed.carbs} target={t.carbs_g} color="#F5B544" />
        <ProgressBar label="fat" value={n.consumed.fat} target={t.fat_g} color="#C58BF0" />
      </section>

      {/* Weight progress */}
      <section className="card">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <span className="mlab">Weight</span>
            <div className="num text-3xl">
              {wp.latest ? wp.latest.kg.toFixed(1) : wp.startKg.toFixed(1)}
              <span className="ml-1 text-sm font-medium text-muted" style={{ fontFamily: "var(--font-body)" }}>kg</span>
            </div>
          </div>
          <div className="text-right">
            <span className="mlab">on plan, today</span>
            <div className="num text-lg text-accent">{wp.targetTodayKg.toFixed(1)}kg</div>
            {wp.deltaVsTargetKg !== null && (
              <div className={`text-xs ${wp.deltaVsTargetKg <= 0 ? "text-accent" : "text-warn"}`}>
                {wp.deltaVsTargetKg <= 0 ? `${Math.abs(wp.deltaVsTargetKg)}kg ahead` : `${wp.deltaVsTargetKg}kg behind`}
              </div>
            )}
          </div>
        </div>
        <WeightTrend series={wp.series} goalStart={wp.goalStart} goalEnd={wp.goalEnd} />
        <div className="mt-2 flex justify-between text-[11px] text-muted">
          <span>{wp.startKg}kg · Jun 1</span>
          <span className="text-accent">— — goal {wp.goalKg}kg · Oct 11</span>
        </div>
        {wp.series.length === 0 && (
          <p className="mt-2 text-xs text-muted">
            Log your weight in a <Link href="/log" className="text-accent">check-in</Link> to start the trend.
          </p>
        )}
      </section>

      {/* Logger */}
      <section className="card">
        <span className="mlab mb-3 block">Log a meal</span>
        <MealLogger />
      </section>

      {/* Today's meals */}
      <section className="card">
        <span className="mlab mb-3 block">Today&apos;s meals</span>
        {n.meals.length === 0 ? (
          <p className="text-sm text-muted">Nothing logged yet.</p>
        ) : (
          <ul className="space-y-3">
            {n.meals.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                {m.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photo_url} alt="" className="h-11 w-11 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-edge text-muted">✎</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{m.title ?? m.ai_items?.[0]?.name ?? m.meal_type ?? "Meal"}</p>
                  <p className="text-xs text-muted">
                    <span className="num">{m.calories_est ?? "?"}</span> kcal · <span className="num">{Math.round(m.protein_g ?? 0)}</span>g P ·{" "}
                    <span className={m.portion_assessment === "large" || m.portion_assessment === "very_large" ? "text-warn" : ""}>{m.portion_assessment ?? "—"}</span>
                  </p>
                </div>
                <span className="num text-xs text-muted">{new Date(m.eaten_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
