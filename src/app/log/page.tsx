"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Daily subjective check-in (mood/energy/soreness/stress + weight + note).
// Meals are logged on the Nutrition tab.
export default function CheckinPage() {
  const [vals, setVals] = useState({ mood: 3, energy: 3, soreness: 2, stress: 2 });
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function submit() {
    setBusy(true);
    try {
      await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...vals, body_weight_kg: weight ? Number(weight) : null, note: note || null }),
      });
      setDone(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="space-y-4 px-4 pt-6">
      <h1 className="text-2xl font-semibold">Check-in</h1>
      {done ? (
        <div className="card text-center">
          <p className="text-accent">Check-in saved ✓</p>
          <button onClick={() => setDone(false)} className="label mt-2">log another</button>
        </div>
      ) : (
        <div className="space-y-4">
          {(["mood", "energy", "soreness", "stress"] as const).map((k) => (
            <div key={k}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="capitalize">{k}</span>
                <span className="text-muted">{vals[k]}/5</span>
              </div>
              <input type="range" min={1} max={5} value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: Number(e.target.value) })} className="w-full accent-green-500" />
            </div>
          ))}
          <input type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Weight (kg) — optional" className="w-full rounded-xl border border-edge bg-panel px-4 py-3 text-sm outline-none focus:border-accent" />
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="How are you feeling? Any niggles?" rows={3} className="w-full rounded-xl border border-edge bg-panel px-4 py-3 text-sm outline-none focus:border-accent" />
          <button onClick={submit} disabled={busy} className="btn-primary w-full disabled:opacity-50">{busy ? "Saving…" : "Save check-in"}</button>
        </div>
      )}
    </main>
  );
}
