"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WeightLog({ latest }: { latest?: number | null }) {
  const [w, setW] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function save() {
    if (!w) return;
    setBusy(true);
    try {
      await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body_weight_kg: Number(w) }),
      });
      setW("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        value={w}
        onChange={(e) => setW(e.target.value)}
        placeholder={latest ? `${latest} kg — log today's` : "Weight (kg)"}
        className="flex-1 rounded-xl border border-edge bg-panel px-4 py-3 text-sm outline-none focus:border-accent"
      />
      <button onClick={save} disabled={busy || !w} className="btn-primary px-5 disabled:opacity-40">
        {busy ? "…" : "Log"}
      </button>
    </div>
  );
}
