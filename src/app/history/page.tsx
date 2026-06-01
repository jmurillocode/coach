import { admin } from "@/lib/supabase";
import { isConfigured } from "@/lib/data";
import { getWeightProgress } from "@/lib/nutrition";
import { Markdown } from "@/components/Markdown";
import { Sparkline, WeightTrend } from "@/components/charts";

export const dynamic = "force-dynamic";

export default async function History() {
  if (!isConfigured()) {
    return (
      <main className="px-4 pt-6">
        <h1 className="text-2xl font-semibold">History</h1>
        <p className="mt-4 text-sm text-muted">Configure the app first (see SETUP.md).</p>
      </main>
    );
  }

  const [metricsRes, briefsRes, journalRes, wp] = await Promise.all([
    admin().from("daily_metrics").select("metric_date, recovery_score, hrv_rmssd_ms, sleep_performance").order("metric_date", { ascending: false }).limit(30),
    admin().from("coaching_briefs").select("*").order("brief_date", { ascending: false }).limit(10),
    admin().from("journal_entries").select("*").order("entry_at", { ascending: false }).limit(14),
    getWeightProgress(),
  ]);

  const metrics = (metricsRes.data ?? []).slice().reverse();
  const recovery = metrics.map((m) => m.recovery_score).filter((v): v is number => typeof v === "number");
  const hrv = metrics.map((m) => m.hrv_rmssd_ms).filter((v): v is number => typeof v === "number");
  const sleep = metrics.map((m) => m.sleep_performance).filter((v): v is number => typeof v === "number");
  const briefs = briefsRes.data ?? [];
  const journal = journalRes.data ?? [];

  const last = (a: number[]) => (a.length ? a[a.length - 1] : null);

  return (
    <main className="space-y-3 px-4 pt-6">
      <h1 className="text-2xl font-semibold">History</h1>

      <section className="card">
        <Trend label="Recovery" data={recovery} color="#46E5A0" suffix="%" current={last(recovery)} />
      </section>
      <section className="card">
        <Trend label="HRV" data={hrv} color="#4FD3E0" suffix=" ms" current={last(hrv)} />
      </section>
      <section className="card">
        <Trend label="Sleep performance" data={sleep} color="#C58BF0" suffix="%" current={last(sleep)} />
      </section>

      {/* Weight */}
      <section className="card">
        <div className="mb-2 flex items-center justify-between">
          <span className="mlab">Weight → goal</span>
          <span className="num text-sm">
            {wp.latest ? `${wp.latest.kg.toFixed(1)}kg` : `${wp.startKg}kg`}
            <span className="text-muted"> → {wp.goalKg}kg</span>
          </span>
        </div>
        <WeightTrend series={wp.series} goalStart={wp.goalStart} goalEnd={wp.goalEnd} />
      </section>

      {/* Briefs */}
      <section className="card">
        <span className="mlab mb-3 block">Past briefs</span>
        <div className="space-y-4">
          {briefs.length === 0 && <p className="text-sm text-muted">No briefs yet.</p>}
          {briefs.map((b) => (
            <div key={b.id} className="border-b border-edge pb-3 last:border-0">
              <p className="mlab mb-1">{b.brief_date}</p>
              <Markdown text={b.body} />
            </div>
          ))}
        </div>
      </section>

      {/* Check-ins */}
      <section className="card">
        <span className="mlab mb-3 block">Check-ins</span>
        <ul className="space-y-2 text-sm">
          {journal.length === 0 && <p className="text-muted">No check-ins yet.</p>}
          {journal.map((j) => (
            <li key={j.id} className="flex justify-between">
              <span className="text-muted">{new Date(j.entry_at).toLocaleDateString()}</span>
              <span className="num text-xs">
                mood {j.mood ?? "—"} · energy {j.energy ?? "—"} · sore {j.soreness ?? "—"}
                {j.body_weight_kg ? ` · ${j.body_weight_kg}kg` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Trend({ label, data, color, suffix, current }: { label: string; data: number[]; color: string; suffix: string; current: number | null }) {
  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <span className="mlab">{label} · {data.length} days</span>
        {current !== null && <span className="num text-sm" style={{ color }}>{Math.round(current)}{suffix}</span>}
      </div>
      <Sparkline data={data} color={color} />
    </>
  );
}
