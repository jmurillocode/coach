import Link from "next/link";
import { getDashboard } from "@/lib/data";
import { Markdown } from "@/components/Markdown";
import { RefreshBriefButton } from "@/components/RefreshBriefButton";
import { Gauge } from "@/components/charts";

export const dynamic = "force-dynamic";

function zone(score: number | null): { color: string; word: string } {
  if (score === null) return { color: "#6B7682", word: "—" };
  if (score >= 67) return { color: "#46E5A0", word: "primed" };
  if (score >= 34) return { color: "#F5B544", word: "moderate" };
  return { color: "#FF5C5C", word: "low" };
}

function hhmm(min: number | null): string {
  if (!min) return "—";
  return `${Math.floor(min / 60)}:${(min % 60).toString().padStart(2, "0")}`;
}

function Bar({ value, target, color }: { value: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const over = value > target;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-edge">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: over ? "#F5B544" : color }} />
    </div>
  );
}

export default async function Home() {
  const d = await getDashboard();
  const hr = new Date().getHours();
  const greeting = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  const m = d.latestMetric;
  const z = zone(m?.recovery_score ?? null);
  const phase = (d.todaySessions[0]?.details?.phase as string) || (d.upcoming[0]?.details?.phase as string) || "";

  // Training summary
  const actualKm = d.weekStats.run_km;
  const plannedKm = d.plannedKm;
  const todayMain =
    d.todaySessions.find((s: any) => ["easy", "long", "workout"].includes(s.session_type)) ?? d.todaySessions[0] ?? null;

  // Nutrition summary
  const kcal = Math.round(d.macros.calories);
  const target = d.targets.daily_kcal;
  const remaining = target - kcal;

  return (
    <main className="space-y-3 px-4 pt-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{greeting}, Jon</h1>
          <p className="mlab mt-0.5">
            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
            {phase ? ` · ${phase.split("—")[0].trim()}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <RefreshBriefButton />
          <Link href="/log" className="mlab text-accent">＋ check-in</Link>
        </div>
      </header>

      {!d.configured && (
        <section className="card border-warn/40">
          <p className="mlab mb-1 text-warn">Setup needed</p>
          <p className="text-sm text-muted">Add env vars and run the SQL files. See SETUP.md.</p>
        </section>
      )}

      {/* RECOVERY */}
      <Link href="/history" className="block">
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <span className="mlab">Recovery</span>
            {!d.whoopConnected ? (
              <span className="mlab text-accent">connect Whoop →</span>
            ) : (
              <span className="mlab">
                {m ? (m.metric_date === new Date().toISOString().slice(0, 10) ? "today" : `latest ${m.metric_date}`) : "no data"}
              </span>
            )}
          </div>
          {m ? (
            <>
              <div className="grid grid-cols-3 gap-1">
                <RingStat label="Strain" value={m.day_strain != null ? Number(m.day_strain) : null} max={21} display={m.day_strain != null ? Number(m.day_strain).toFixed(1) : "—"} color="#C58BF0" />
                <RingStat label="Recovery" value={m.recovery_score} max={100} display={`${m.recovery_score ?? "—"}`} color={z.color} />
                <RingStat label="Sleep" value={m.sleep_performance} max={100} display={`${m.sleep_performance ?? "—"}`} color="#4FD3E0" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-edge pt-3">
                <Stat label="hrv" value={m.hrv_rmssd_ms ? `${Math.round(m.hrv_rmssd_ms)}` : "—"} unit="ms" />
                <Stat label="rest hr" value={m.resting_hr ? `${m.resting_hr}` : "—"} unit="bpm" />
                <Stat label="slept" value={hhmm(m.sleep_duration_min)} unit="h" />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">{d.whoopConnected ? "No recovery data yet — tap refresh." : "Connect Whoop to see your recovery."}</p>
          )}
        </section>
      </Link>

      {/* TRAINING */}
      <Link href="/training" className="block">
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <span className="mlab">Training · this week</span>
            <span className="mlab text-accent">open →</span>
          </div>
          <div className="mb-1 flex items-baseline gap-2">
            <span className="num text-3xl">{actualKm}</span>
            <span className="text-sm text-muted">/ {plannedKm} km planned</span>
          </div>
          <Bar value={actualKm} target={plannedKm} color="#4FD3E0" />
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-muted">
              <span className="num text-dim">{d.weekStats.by_sport.running?.count ?? 0}</span>/{d.plannedRunSessions} runs · {d.weekStats.cross_min}min cross
            </span>
            <span className="text-dim">
              today: {todayMain ? todayMain.title : "rest"}
              {todayMain?.planned_distance_km ? ` · ${todayMain.planned_distance_km}km` : ""}
            </span>
          </div>
        </section>
      </Link>

      {/* NUTRITION */}
      <Link href="/nutrition" className="block">
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <span className="mlab">Nutrition · today</span>
            <span className="mlab text-accent">open →</span>
          </div>
          <div className="mb-1 flex items-baseline gap-2">
            <span className="num text-3xl">{kcal.toLocaleString()}</span>
            <span className="text-sm text-muted">/ {target.toLocaleString()} kcal</span>
            <span className={`ml-auto num text-sm ${remaining < 0 ? "text-warn" : "text-accent"}`}>
              {remaining < 0 ? `${Math.abs(remaining)} over` : `${remaining} left`}
            </span>
          </div>
          <Bar value={kcal} target={target} color="#46E5A0" />
          <div className="mt-3 flex items-center justify-between text-xs text-muted">
            <span><span className="num text-dim">{Math.round(d.macros.protein)}</span>/{d.targets.protein_g}g protein</span>
            <span><span className="num text-dim">{Math.round(d.macros.carbs)}</span>g C · <span className="num text-dim">{Math.round(d.macros.fat)}</span>g F</span>
          </div>
        </section>
      </Link>

      {/* COACH */}
      <section className="card-accent">
        <span className="mlab mb-2 block text-accent">Coach</span>
        {d.brief ? <Markdown text={d.brief.body} /> : <p className="text-sm text-muted">No brief yet — tap refresh up top.</p>}
      </section>
    </main>
  );
}

function RingStat({ label, value, max, display, color }: { label: string; value: number | null; max: number; display: string; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <Gauge value={value ?? 0} max={max} display={display} color={color} numColor="#E8EDF2" size={92} stroke={7} />
      <span className="mlab mt-1">{label}</span>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <div className="mlab">{label}</div>
      <div className="num text-xl">
        {value}
        {unit && value !== "—" && <span className="ml-0.5 text-[11px] font-medium text-muted" style={{ fontFamily: "var(--font-body)" }}>{unit}</span>}
      </div>
    </div>
  );
}
