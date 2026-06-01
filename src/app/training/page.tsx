import { admin } from "@/lib/supabase";
import { isConfigured } from "@/lib/data";
import { getTodayNext, getWeekStats, getWeekPlan } from "@/lib/training";

export const dynamic = "force-dynamic";

const ICON: Record<string, string> = {
  easy: "🟢", long: "🔵", workout: "🟡", strength: "🟠", cross: "🚲", rest: "⚪",
};

function fmtPace(s: number | null): string {
  if (!s) return "";
  const m = Math.floor(s / 60);
  return `${m}:${Math.round(s % 60).toString().padStart(2, "0")}/km`;
}

function Session({ s, dim = false }: { s: any; dim?: boolean }) {
  const d = s.details || {};
  const extras: string[] = [];
  if (d.structure) extras.push(d.structure);
  if (d.reps) extras.push(d.reps);
  if (d.finish_mp_km) extras.push(`last ${d.finish_mp_km}km @ MP`);
  if (d.mp_block_km) extras.push(`${d.mp_block_km}km @ MP`);
  if (d.strides) extras.push(d.strides);
  if (d.exercises) extras.push((d.exercises as string[]).join(" · "));
  if (d.minutes) extras.push(`${d.minutes} min`);
  return (
    <div className={`${dim ? "opacity-70" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm">
          <span className="mr-1">{ICON[s.session_type] ?? "•"}</span>
          {s.title ?? s.session_type}
        </span>
        <span className="text-xs text-muted">
          {s.planned_distance_km ? `${s.planned_distance_km}km` : ""} {s.target_pace ?? ""}
        </span>
      </div>
      {extras.length > 0 && <p className="mt-1 pl-5 text-xs text-muted">{extras.join(" · ")}</p>}
      {s.coach_note && <p className="mt-1 pl-5 text-xs text-[#c9d4e0]">{s.coach_note}</p>}
    </div>
  );
}

export default async function Training() {
  if (!isConfigured()) {
    return (
      <main className="px-4 pt-6">
        <h1 className="text-2xl font-semibold">Training</h1>
        <p className="mt-4 text-sm text-muted">Configure the app first (see SETUP.md).</p>
      </main>
    );
  }

  const [{ today, tomorrow }, stats, weekPlan, recent] = await Promise.all([
    getTodayNext(),
    getWeekStats(),
    getWeekPlan(),
    admin().from("workouts").select("*").order("start_time", { ascending: false }).limit(6),
  ]);
  const phase = (today[0]?.details?.phase as string) || (weekPlan[0]?.details?.phase as string) || "";
  const recentWorkouts = recent.data ?? [];

  return (
    <main className="space-y-4 px-4 pt-6">
      <header>
        <h1 className="text-2xl font-semibold">Training</h1>
        {phase && <p className="text-sm text-muted">{phase} · Chicago Oct 11</p>}
      </header>

      {/* Weekly rollup */}
      <section className="card">
        <p className="label mb-3">This week</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Metric value={`${stats.distance_km}`} unit="km" />
          <Metric value={`${Math.floor(stats.duration_min / 60)}h ${stats.duration_min % 60}m`} unit="time" />
          <Metric value={`${stats.sessions}`} unit="sessions" />
          <Metric value={stats.calories ? `${stats.calories}` : "—"} unit="kcal" />
          <Metric value={stats.avg_hr ? `${stats.avg_hr}` : "—"} unit="avg hr" />
          <Metric value={`${stats.by_sport.running?.km ? Math.round(stats.by_sport.running.km) : 0}`} unit="run km" />
        </div>
      </section>

      {/* Today */}
      <section className="card">
        <p className="label mb-3">Today</p>
        {today.length === 0 ? <p className="text-sm text-muted">Rest / nothing planned.</p> : (
          <div className="space-y-3">{today.map((s) => <Session key={s.id} s={s} />)}</div>
        )}
      </section>

      {/* Tomorrow */}
      <section className="card">
        <p className="label mb-3">Tomorrow</p>
        {tomorrow.length === 0 ? <p className="text-sm text-muted">Rest / nothing planned.</p> : (
          <div className="space-y-3">{tomorrow.map((s) => <Session key={s.id} s={s} dim />)}</div>
        )}
      </section>

      {/* This week's plan */}
      <section className="card">
        <p className="label mb-3">This week&apos;s plan</p>
        <div className="space-y-3">
          {weekPlan.map((s) => (
            <div key={s.id} className="flex gap-3">
              <span className="w-9 shrink-0 text-xs text-muted">
                {new Date(s.day_date).toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <div className="flex-1"><Session s={s} /></div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent workouts */}
      {recentWorkouts.length > 0 && (
        <section className="card">
          <p className="label mb-3">Logged workouts</p>
          <ul className="space-y-2">
            {recentWorkouts.map((w) => (
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

function Metric({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="rounded-xl border border-edge py-2">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted">{unit}</div>
    </div>
  );
}
