"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Tab = "meal" | "checkin";

// Downscale an image file to <=1024px and return base64 (no data: prefix) + mime.
async function toBase64(file: File): Promise<{ data: string; media: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const max = 1024;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
  const out = canvas.toDataURL("image/jpeg", 0.85);
  return { data: out.split(",")[1], media: "image/jpeg" };
}

export default function LogPage() {
  const [tab, setTab] = useState<Tab>("meal");
  return (
    <main className="space-y-4 px-4 pt-6">
      <h1 className="text-2xl font-semibold">Log</h1>
      <div className="flex gap-2">
        <TabBtn active={tab === "meal"} onClick={() => setTab("meal")}>Meal</TabBtn>
        <TabBtn active={tab === "checkin"} onClick={() => setTab("checkin")}>Check-in</TabBtn>
      </div>
      {tab === "meal" ? <MealForm /> : <CheckinForm />}
    </main>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium ${active ? "bg-accent text-ink" : "border border-edge text-muted"}`}
    >
      {children}
    </button>
  );
}

function MealForm() {
  const [preview, setPreview] = useState<string | null>(null);
  const [payload, setPayload] = useState<{ data: string; media: string } | null>(null);
  const [mealType, setMealType] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setResult(null);
    const b = await toBase64(file);
    setPayload(b);
    setPreview(`data:${b.media};base64,${b.data}`);
  }

  async function analyze() {
    if (!payload) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/food/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: payload.data,
          media_type: payload.media,
          meal_type: mealType || undefined,
          user_note: note || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "failed");
      setResult(json.meal);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="card flex cursor-pointer flex-col items-center justify-center py-10 text-center">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="max-h-56 rounded-xl object-contain" />
        ) : (
          <>
            <span className="text-4xl">📷</span>
            <span className="mt-2 text-sm text-muted">Tap to photograph your meal</span>
          </>
        )}
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
      </label>

      {preview && (
        <>
          <div className="flex gap-2">
            {["breakfast", "lunch", "dinner", "snack"].map((t) => (
              <button
                key={t}
                onClick={() => setMealType(t)}
                className={`flex-1 rounded-lg py-2 text-xs capitalize ${mealType === t ? "bg-edge text-white" : "border border-edge text-muted"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note (e.g. 'felt hungry after long run')"
            className="w-full rounded-xl border border-edge bg-panel px-4 py-3 text-sm outline-none focus:border-accent"
          />
          <button onClick={analyze} disabled={busy} className="btn-primary w-full disabled:opacity-50">
            {busy ? "Analyzing…" : "Analyze meal"}
          </button>
        </>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {result && (
        <div className="card space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{result.calories_est} kcal</p>
            <span className="text-xs uppercase tracking-wide text-warn">portion: {result.portion_assessment}</span>
          </div>
          <p className="text-xs text-muted">
            {Math.round(result.protein_g)}g protein · {Math.round(result.carbs_g)}g carbs · {Math.round(result.fat_g)}g fat
          </p>
          <ul className="text-sm">
            {(result.ai_items ?? []).map((it: any, i: number) => (
              <li key={i} className="flex justify-between">
                <span>{it.name} <span className="text-muted">({it.portion})</span></span>
                <span className="text-muted">{it.calories} kcal</span>
              </li>
            ))}
          </ul>
          {result.ai_notes && <p className="border-t border-edge pt-2 text-sm text-[#c9d4e0]">{result.ai_notes}</p>}
        </div>
      )}
    </div>
  );
}

function CheckinForm() {
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
        body: JSON.stringify({
          ...vals,
          body_weight_kg: weight ? Number(weight) : null,
          note: note || null,
        }),
      });
      setDone(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card text-center">
        <p className="text-accent">Check-in saved ✓</p>
        <button onClick={() => setDone(false)} className="label mt-2">log another</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(["mood", "energy", "soreness", "stress"] as const).map((k) => (
        <div key={k}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="capitalize">{k}</span>
            <span className="text-muted">{vals[k]}/5</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            value={vals[k]}
            onChange={(e) => setVals({ ...vals, [k]: Number(e.target.value) })}
            className="w-full accent-green-500"
          />
        </div>
      ))}
      <input
        type="number"
        inputMode="decimal"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        placeholder="Weight (kg) — optional"
        className="w-full rounded-xl border border-edge bg-panel px-4 py-3 text-sm outline-none focus:border-accent"
      />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="How are you feeling? Any niggles?"
        rows={3}
        className="w-full rounded-xl border border-edge bg-panel px-4 py-3 text-sm outline-none focus:border-accent"
      />
      <button onClick={submit} disabled={busy} className="btn-primary w-full disabled:opacity-50">
        {busy ? "Saving…" : "Save check-in"}
      </button>
    </div>
  );
}
