import { admin } from "@/lib/supabase";
import { isConfigured } from "@/lib/data";
import { Markdown } from "@/components/Markdown";

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

  const db = admin();
  const [briefs, journal, metrics] = await Promise.all([
    db.from("coaching_briefs").select("*").order("brief_date", { ascending: false }).limit(14),
    db.from("journal_entries").select("*").order("entry_at", { ascending: false }).limit(14),
    db.from("daily_metrics").select("*").order("metric_date", { ascending: false }).limit(14),
  ]);

  return (
    <main className="space-y-4 px-4 pt-6">
      <h1 className="text-2xl font-semibold">History</h1>

      <section className="card">
        <p className="label mb-3">Recovery trend (last 14 days)</p>
        {(metrics.data ?? []).length === 0 ? (
          <p className="text-sm text-muted">No data yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {(metrics.data ?? []).map((m) => (
              <li key={m.metric_date} className="flex justify-between">
                <span className="text-muted">{m.metric_date}</span>
                <span>
                  rec {m.recovery_score ?? "—"}% · sleep {m.sleep_performance ?? "—"}% · HRV {m.hrv_rmssd_ms ? Math.round(m.hrv_rmssd_ms) : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <p className="label mb-3">Past briefs</p>
        <div className="space-y-4">
          {(briefs.data ?? []).map((b) => (
            <div key={b.id} className="border-b border-edge pb-3 last:border-0">
              <p className="mb-1 text-xs text-muted">{b.brief_date}</p>
              <Markdown text={b.body} />
            </div>
          ))}
          {(briefs.data ?? []).length === 0 && <p className="text-sm text-muted">No briefs yet.</p>}
        </div>
      </section>

      <section className="card">
        <p className="label mb-3">Check-ins</p>
        <ul className="space-y-2 text-sm">
          {(journal.data ?? []).map((j) => (
            <li key={j.id} className="flex justify-between">
              <span className="text-muted">{new Date(j.entry_at).toLocaleDateString()}</span>
              <span>
                mood {j.mood ?? "—"} · energy {j.energy ?? "—"} · sore {j.soreness ?? "—"}
                {j.body_weight_kg ? ` · ${j.body_weight_kg}kg` : ""}
              </span>
            </li>
          ))}
          {(journal.data ?? []).length === 0 && <p className="text-muted">No check-ins yet.</p>}
        </ul>
      </section>
    </main>
  );
}
