import Link from "next/link";
import { getWeightProgress } from "@/lib/nutrition";
import { isConfigured } from "@/lib/data";
import { WeightTrend } from "@/components/charts";
import { WeightLog } from "@/components/WeightLog";

export const dynamic = "force-dynamic";

export default async function Weight() {
  if (!isConfigured()) {
    return (
      <main className="px-4 pt-6">
        <h1 className="text-2xl font-semibold">Weight</h1>
        <p className="mt-4 text-sm text-muted">Configure the app first (see SETUP.md).</p>
      </main>
    );
  }

  const wp = await getWeightProgress();

  return (
    <main className="space-y-3 px-4 pt-6">
      <header>
        <h1 className="text-2xl font-semibold">Weight</h1>
        <p className="mlab mt-0.5">{wp.startKg}kg → goal {wp.goalKg}kg · Chicago Oct 11</p>
      </header>

      {/* Current + goal */}
      <section className="card">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <span className="mlab">Latest</span>
            <div className="num text-4xl">
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
          <span>{wp.startKg}kg · start</span>
          <span className="text-accent">— — goal {wp.goalKg}kg</span>
        </div>
      </section>

      {/* Log */}
      <section className="card">
        <span className="mlab mb-3 block">Log weight</span>
        <WeightLog latest={wp.latest?.kg ?? null} />
        {wp.series.length === 0 && (
          <p className="mt-2 text-xs text-muted">
            Weigh in daily under the same conditions (right after waking). The <Link href="/history" className="text-accent">trend</Link> is the signal, not any single day.
          </p>
        )}
      </section>
    </main>
  );
}
