import Link from "next/link";
import { getDashboard } from "@/lib/data";
import { Markdown } from "@/components/Markdown";
import { RefreshBriefButton } from "@/components/RefreshBriefButton";

export const dynamic = "force-dynamic";

function recoveryColor(score: number | null): string {
  if (score === null) return "text-muted";
  if (score >= 67) return "text-accent";
  if (score >= 34) return "text-warn";
  return "text-danger";
}

function fmtPace(s: number | null): string {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}/km`;
}

export default async function Home() {
  const d = await getDashboard();
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";
  const m = d.latestMetric;

  return (
    <main className="space-y-4 px-4 pt-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{greeting}, Jon</h1>
          <p className="text-sm text-muted">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
      </header>

      {!d.configured && (
        <section className="card border-warn/40">
          <p className="label mb-1 text-warn">Setup needed</p>
          <p className="text-sm text-muted">
            Add your env vars (Supabase, Anthropic, Whoop) and run <code>supabase/schema.sql</code>. See
            SETUP.md.
          </p>
        </section>
      )}

      {/* Recovery */}
      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <p className="label">Today&apos;s readiness</p>
          {!d.whoopConnected && (
            <a href="/api/whoop/auth" className="label text-accent">connect Whoop →</a>
          )}
        </div>
        {m ? (
          <div className="flex items-center gap-5">
            <div className={`text-5xl font-bold ${recoveryColor(m.recovery_score)}`}>
              {m.recovery_score ?? "—"}
              <span className="ml-1 text-base font-normal text-muted">%</span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <Stat label="HRV" value={m.hrv_rmssd_ms ? `${Math.round(m.hrv_rmssd_ms)} ms` : "—"} />
              <Stat label="RHR" value={m.resting_hr ? `${m.resting_hr} bpm` : "—"} />
              <Stat label="Sleep" value={m.sleep_performance ? `${m.sleep_performance}%` : "—"} />
              <Stat
                label="Slept"
                value={m.sleep_duration_min ? `${Math.floor(m.sleep_duration_min / 60)}h ${m.sleep_duration_min % 60}m` : "—"}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">
            No recovery data yet. {d.whoopConnected ? "Run a sync from Today." : "Connect Whoop to pull your recovery and sleep."}
          </p>
        )}
      </section>

      {/* Coaching brief */}
      <section className="card">
        <div className="mb-2 flex items-center justify-between">
          <p className="label">Coach</p>
          <RefreshBriefButton />
        </div>
        {d.brief ? (
          <Markdown text={d.brief.body} />
        ) : (
          <p className="text-sm text-muted">No brief yet. Tap refresh to generate today&apos;s coaching.</p>
        )}
      </section>

      {/* Nutrition */}
      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <p className="label">Today&apos;s food</p>
          <Link href="/log" className="label text-accent">+ log a meal</Link>
        </div>
        <div className="mb-3 grid grid-cols-4 gap-2 text-center">
          <Macro label="kcal" value={Math.round(d.macros.calories)} />
          <Macro label="protein" value={`${Math.round(d.macros.protein)}g`} />
          <Macro label="carbs" value={`${Math.round(d.macros.carbs)}g`} />
          <Macro label="fat" value={`${Math.round(d.macros.fat)}g`} />
        </div>
        {d.todaysMeals.length === 0 ? (
          <p className="text-sm text-muted">Nothing logged yet today.</p>
        ) : (
          <ul className="space-y-2">
            {d.todaysMeals.map((meal) => (
              <li key={meal.id} className="flex items-center gap-3">
                {meal.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={meal.photo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {(meal.ai_items?.[0]?.name as string) ?? meal.meal_type ?? "Meal"}
                    {meal.ai_items?.length > 1 ? ` +${meal.ai_items.length - 1}` : ""}
                  </p>
                  <p className="text-xs text-muted">
                    {meal.calories_est ?? "?"} kcal · portion: {meal.portion_assessment ?? "—"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Upcoming plan */}
      {d.upcoming.length > 0 && (
        <section className="card">
          <p className="label mb-3">Next sessions</p>
          <ul className="space-y-2">
            {d.upcoming.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <span>
                  <span className="text-muted">{new Date(s.day_date).toLocaleDateString(undefined, { weekday: "short" })}</span>{" "}
                  {s.title ?? s.session_type}
                </span>
                <span className="text-xs text-muted">
                  {s.planned_distance_km ? `${s.planned_distance_km}km` : ""} {s.target_pace ?? ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Recent workouts */}
      {d.recentWorkouts.length > 0 && (
        <section className="card">
          <p className="label mb-3">Recent workouts</p>
          <ul className="space-y-2">
            {d.recentWorkouts.map((w) => (
              <li key={w.id} className="flex items-center justify-between text-sm">
                <span className="capitalize">
                  {w.sport ?? "workout"}{" "}
                  <span className="text-muted">{new Date(w.start_time).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                </span>
                <span className="text-xs text-muted">
                  {w.distance_m ? `${(w.distance_m / 1000).toFixed(1)}km` : ""} {fmtPace(w.avg_pace_s_per_km)} {w.avg_hr ? `· ${w.avg_hr}bpm` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted">{label}</span> <span className="font-medium">{value}</span>
    </div>
  );
}

function Macro({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-edge py-2">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}
