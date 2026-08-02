"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Meal = {
  id: string;
  eaten_at: string;
  title: string | null;
  meal_type: string | null;
  photo_url: string | null;
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

  async function save(id: string, patch: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/food/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setBusy(false);
    setEditing(null);
    router.refresh();
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
          {editing === m.id && <MealEdit meal={m} busy={busy} onSave={(p) => save(m.id, p)} onCancel={() => setEditing(null)} />}
        </li>
      ))}
    </ul>
  );
}

function MealEdit({ meal, busy, onSave, onCancel }: { meal: Meal; busy: boolean; onSave: (p: Record<string, unknown>) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(meal.title ?? "");
  const [kcal, setKcal] = useState(String(meal.calories_est ?? ""));
  const [p, setP] = useState(String(Math.round(meal.protein_g ?? 0)));
  const [c, setC] = useState(String(Math.round(meal.carbs_g ?? 0)));
  const [f, setF] = useState(String(Math.round(meal.fat_g ?? 0)));

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-edge bg-ink/40 p-3">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name" className="w-full rounded-lg border border-edge bg-panel px-3 py-2 text-sm outline-none focus:border-accent" />
      <div className="grid grid-cols-4 gap-2">
        <Num label="kcal" value={kcal} set={setKcal} />
        <Num label="P" value={p} set={setP} />
        <Num label="C" value={c} set={setC} />
        <Num label="F" value={f} set={setF} />
      </div>
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={() => onSave({ title, calories_est: Number(kcal) || 0, protein_g: Number(p) || 0, carbs_g: Number(c) || 0, fat_g: Number(f) || 0 })}
          className="btn-primary flex-1 py-2 text-sm disabled:opacity-40"
        >
          Save
        </button>
        <button onClick={onCancel} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
      </div>
    </div>
  );
}

function Num({ label, value, set }: { label: string; value: string; set: (v: string) => void }) {
  return (
    <div>
      <div className="mlab mb-0.5">{label}</div>
      <input inputMode="numeric" value={value} onChange={(e) => set(e.target.value)} className="w-full rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent" />
    </div>
  );
}
