import { admin } from "@/lib/supabase";
import { isConfigured } from "@/lib/data";
import { getTodayNext, getWeekStats, getNext7Plan, next7Dates, getWeeklyVolumeSeries } from "@/lib/training";
import { WeekBars } from "@/components/WeekBars";
import { WeekPlanEditor } from "@/components/WeekPlanEditor";

export const dynamic = "force-dynamic";

const DOT: Record<string, string> = {
  easy: "#46E5A0", long: "#4FD3E0", workout: "#F5B544", strength: "#C58BF0", cross: "#8A949E", rest: "#3A434D",
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
  if (d.goal) extras.push(d.goal);
  return (
    <div className={dim ? "opacity-60" : ""}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ background: DOT[s.session_type] ?? "#8A949E" }} />
          {s.title ?? s.session_type}
        </span>
        <span className="num text-xs text-muted">
          {s.planned_distance_km ? `${s.planned_distance_km}km` : ""} {s.target_pace ?? ""}
        </span>
      </div>
      {extras.length > 0 && <p className="mt-1 pl-4 text-xs text-muted">{extras.join(" · ")}</p>}
      {s.coach_note && <p className="mt-1 pl-4 text-xs text-dim">{s.coach_note}</p>}
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

  const [{ today, tomorrow }, stats, weekPlan, volume, recent] = await Promise.all([
    getTodayNext(),
    getWeekStats(),
    getNext7Plan(),
    getWeeklyVolumeSeries(),
    admin().from("workouts").select("*").order("start_time", { ascending: false }).limit(6),
  ]);
  const phase = (today[0]?.details?.phase as string) || (weekPlan[0]?.details?.phase as string) || "";
  const recentWorkouts = recent.data ?? [];
  const thisWeekPlanned = volume.currentIndex >= 0 ? volume.weeks[volume.currentIndex]?.km ?? 0 : 0;
  const weekPlanKm = Math.round(weekPlan.reduce((s, x) => s + Number(x.planned_distance_km ?? 0), 0));

  return (
    <main className="space-y-3 px-4 pt-6">
      <header>
        <h1 className="text-2xl font-semibold">Training</h1>
        {phase && <p className="mlab mt-0.5">{phase} · Chicago Oct 11</p>}
      </header>

      {/* Build arc — hover/tap a week for its planned km */}
      {volume.weeks.length > 0 && (
        <section className="card">
          <WeekBars weeks={volume.weeks} currentIndex={volume.currentIndex} />
        </section>
      )}

      {/* Weekly rollup */}
      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <span className="mlab">This week — actual</span>
          {thisWeekPlanned > 0 && <span className="mlab">plan {thisWeekPlanned}km</span>}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Metric value={`${stats.run_km}`} unit="run km" />
          <Metric value={`${Math.floor(stats.duration_min / 60)}:${(stats.duration_min % 60).toString().padStart(2, "0")}`} unit="hours" />
          <Metric value={`${stats.sessions}`} unit="sessions" />
          <Metric value={`${stats.cross_min}`} unit="cross min" />
          <Metric value={stats.avg_hr ? `${stats.avg_hr}` : "—"} unit="avg hr" />
          <Metric value={stats.calories ? `${(stats.calories / 1000).toFixed(1)}k` : "—"} unit="kcal" />
        </div>
      </section>

      {/* Today / tomorrow */}
      <section className="card">
        <span className="mlab">Today</span>
        <div className="mt-2">
          {today.length === 0 ? <p className="text-sm text-muted">Rest / nothing planned.</p> : <div className="space-y-3">{today.map((s) => <Session key={s.id} s={s} />)}</div>}
        </div>
      </section>
      <section className="card">
        <span className="mlab">Tomorrow</span>
        <div className="mt-2">
          {tomorrow.length === 0 ? <p className="text-sm text-muted">Rest / nothing planned.</p> : <div className="space-y-3">{tomorrow.map((s) => <Session key={s.id} s={s} dim />)}</div>}
        </div>
      </section>

      {/* Week plan — reschedulable */}
      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <span className="mlab">Next 7 days · {weekPlanKm} km</span>
          <span className="mlab">↔ tap to move</span>
        </div>
        <WeekPlanEditor sessions={weekPlan} moveDates={next7Dates()} />
      </section>

      {/* Logged workouts */}
      {recentWorkouts.length > 0 && (
        <section className="card">
          <span className="mlab mb-3 block">Logged workouts</span>
          <ul className="space-y-2">
            {recentWorkouts.map((w) => (
              <li key={w.id} className="flex items-center justify-between text-sm">
                <span className="capitalize">
                  {w.sport ?? "workout"} <span className="text-muted">{new Date(w.start_time).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                </span>
                <span className="num text-xs text-muted">
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
    <div className="rounded-xl border border-edge py-2 text-center">
      <div className="num text-xl">{value}</div>
      <div className="mlab mt-0.5">{unit}</div>
    </div>
  );
}
