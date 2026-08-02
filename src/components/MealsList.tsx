"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Meal = {
  id: string;
  eaten_at: string;
  title: string | null;
  meal_type: string | null;
  photo_url: string | null;
  user_note: string | null;
  calories_est: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  portion_assessment: string | null;
  ai_items?: { name: string }[];
};

export function MealsList({ meals }: { meals: Meal[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (meals.length === 0) return <p className="text-sm text-muted">Nothing logged yet.</p>;

  async function del(id: string) {
    setBusy(true);
    await fetch(`/api/food/${id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  async function reanalyze(id: string, text: string): Promise<string | null> {
    setBusy(true);
    try {
      const res = await fetch(`/api/food/${id}/reanalyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!res.ok) return json.error || "failed";
      setEditing(null);
      router.refresh();
      return null;
    } finally {
      setBusy(false);
    }
  }

  return (
    <ul className="space-y-3">
      {meals.map((m) => (
        <li key={m.id}>
          <div className="flex items-center gap-3">
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
            <button onClick={() => setEditing(editing === m.id ? null : m.id)} className="px-1.5 text-muted hover:text-accent" aria-label="Edit">✎</button>
            <button onClick={() => del(m.id)} disabled={busy} className="px-1.5 text-muted hover:text-danger disabled:opacity-40" aria-label="Delete">🗑</button>
          </div>
          {editing === m.id && <MealEdit meal={m} onReanalyze={(t) => reanalyze(m.id, t)} onCancel={() => setEditing(null)} />}
        </li>
      ))}
    </ul>
  );
}

function MealEdit({ meal, onReanalyze, onCancel }: { meal: Meal; onReanalyze: (text: string) => Promise<string | null>; onCancel: () => void }) {
  const [text, setText] = useState(meal.user_note ?? meal.title ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    const err = await onReanalyze(text.trim());
    if (err) setError(err);
    setBusy(false);
  }

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-edge bg-ink/40 p-3">
      <p className="mlab">Fix the description, then re-analyze</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="w-full rounded-lg border border-edge bg-panel px-3 py-2 text-sm outline-none focus:border-accent"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button disabled={busy || !text.trim()} onClick={go} className="btn-primary flex-1 py-2 text-sm disabled:opacity-40">
          {busy ? "Re-analyzing…" : "Re-analyze"}
        </button>
        <button onClick={onCancel} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
      </div>
      <p className="text-[11px] text-muted">Or delete it (🗑 above) and log again.</p>
    </div>
  );
}
