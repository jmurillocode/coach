import Link from "next/link";
import { getDashboard } from "@/lib/data";
import { Markdown } from "@/components/Markdown";
import { RefreshBriefButton } from "@/components/RefreshBriefButton";
import { Gauge, Sparkline, MiniBars } from "@/components/charts";

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

export default async function Home() {
  const d = await getDashboard();
  const hr = new Date().getHours();
  const greeting = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  const m = d.latestMetric;
  const z = zone(m?.recovery_score ?? null);
  const phase = (d.upcoming[0]?.details?.phase as string) || "";
  const recoveryTrend = d.recentMetrics.map((r: any) => r.recovery_score).filter((v: any) => typeof v === "number");
  const loadKm = d.volume.weeks.map((w) => w.km);
  const peak = loadKm.length ? Math.max(...loadKm) : 0;

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

      {/* Recovery gauge */}
      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <span className="mlab">Today&apos;s readiness</span>
          {!d.whoopConnected && <Link href="/api/whoop/auth" className="mlab text-accent">connect Whoop →</Link>}
        </div>
        {m ? (
          <div className="flex items-center gap-5">
            <Gauge value={m.recovery_score ?? 0} display={`${m.recovery_score ?? "—"}`} sub={z.word.toUpperCase()} color={z.color} size={108} />
            <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3">
              <Stat label="hrv" value={m.hrv_rmssd_ms ? `${Math.round(m.hrv_rmssd_ms)}` : "—"} unit="ms" />
              <Stat label="rest hr" value={m.resting_hr ? `${m.resting_hr}` : "—"} unit="bpm" />
              <Stat label="sleep" value={m.sleep_performance ? `${m.sleep_performance}` : "—"} unit="%" />
              <Stat label="slept" value={hhmm(m.sleep_duration_min)} unit="h" />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">
            {d.whoopConnected ? "No recovery data yet — refresh below." : "Connect Whoop to see your recovery."}
          </p>
        )}
      </section>

      {/* Recovery trend */}
      {recoveryTrend.length >= 2 && (
        <section className="card">
          <div className="mb-2 flex items-center justify-between">
            <span className="mlab">Recovery · {recoveryTrend.length} days</span>
          </div>
          <Sparkline data={recoveryTrend} color={z.color} />
        </section>
      )}

      {/* Training load arc */}
      {loadKm.length > 0 && (
        <section className="card">
          <div className="mb-2 flex items-center justify-between">
            <span className="mlab">Training load → Chicago</span>
            <span className="mlab">{peak} km peak</span>
          </div>
          <MiniBars data={loadKm} highlight={d.volume.currentIndex} />
        </section>
      )}

      {/* Coach */}
      <section className="card-accent">
        <span className="mlab mb-2 block text-accent">Coach</span>
        {d.brief ? <Markdown text={d.brief.body} /> : <p className="text-sm text-muted">No brief yet — tap refresh up top.</p>}
      </section>

      {/* Nutrition mini */}
      <section className="card">
        <div className="flex items-center justify-between">
          <span className="mlab">Today&apos;s fuel</span>
          <Link href="/nutrition" className="mlab text-accent">＋ log a meal</Link>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="num text-3xl">{Math.round(d.macros.calories)}</span>
          <span className="text-sm text-muted">kcal · {Math.round(d.macros.protein)}g protein</span>
        </div>
      </section>

      {/* Next session */}
      {d.upcoming.length > 0 && (
        <section className="card">
          <span className="mlab">Next sessions</span>
          <ul className="mt-2 space-y-2">
            {d.upcoming.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <span>
                  <span className="text-muted">{new Date(s.day_date).toLocaleDateString(undefined, { weekday: "short" })}</span>{" "}
                  {s.title ?? s.session_type}
                </span>
                <span className="num text-xs text-muted">{s.planned_distance_km ? `${s.planned_distance_km}km` : ""} {s.target_pace ?? ""}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
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
