"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  return { data: canvas.toDataURL("image/jpeg", 0.85).split(",")[1], media: "image/jpeg" };
}

export function MealLogger() {
  const [mode, setMode] = useState<"photo" | "text">("photo");
  const [preview, setPreview] = useState<string | null>(null);
  const [payload, setPayload] = useState<{ data: string; media: string } | null>(null);
  const [text, setText] = useState("");
  const [mealType, setMealType] = useState("");
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

  async function submit() {
    setBusy(true);
    setError("");
    try {
      let res: Response;
      if (mode === "photo") {
        if (!payload) return;
        res = await fetch("/api/food/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_base64: payload.data, media_type: payload.media, meal_type: mealType || undefined }),
        });
      } else {
        if (!text.trim()) return;
        res = await fetch("/api/food/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, meal_type: mealType || undefined }),
        });
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "failed");
      setResult(json.meal);
      setPreview(null);
      setPayload(null);
      setText("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => setMode("photo")} className={`flex-1 rounded-xl py-2 text-sm font-medium ${mode === "photo" ? "bg-accent text-ink" : "border border-edge text-muted"}`}>📷 Photo</button>
        <button onClick={() => setMode("text")} className={`flex-1 rounded-xl py-2 text-sm font-medium ${mode === "text" ? "bg-accent text-ink" : "border border-edge text-muted"}`}>✎ Text</button>
      </div>

      {mode === "photo" ? (
        <label className="card flex cursor-pointer flex-col items-center justify-center py-8 text-center">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="max-h-48 rounded-xl object-contain" />
          ) : (
            <>
              <span className="text-3xl">📷</span>
              <span className="mt-2 text-sm text-muted">Tap to photograph your meal</span>
            </>
          )}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
        </label>
      ) : (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Describe it, e.g. '2 eggs, 2 toast with butter, banana, black coffee'"
          className="w-full rounded-xl border border-edge bg-panel px-4 py-3 text-sm outline-none focus:border-accent"
        />
      )}

      <div className="flex gap-2">
        {["breakfast", "lunch", "dinner", "snack"].map((t) => (
          <button key={t} onClick={() => setMealType(t)} className={`flex-1 rounded-lg py-2 text-xs capitalize ${mealType === t ? "bg-edge text-white" : "border border-edge text-muted"}`}>{t}</button>
        ))}
      </div>

      <button onClick={submit} disabled={busy || (mode === "photo" ? !payload : !text.trim())} className="btn-primary w-full disabled:opacity-50">
        {busy ? "Analyzing…" : "Log meal"}
      </button>

      {error && <p className="text-sm text-danger">{error}</p>}

      {result && (
        <div className="card space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{result.title ?? result.ai_items?.[0]?.name ?? "Meal"} · {result.calories_est} kcal</p>
            <span className="text-xs uppercase tracking-wide text-warn">{result.portion_assessment}</span>
          </div>
          <p className="text-xs text-muted">{Math.round(result.protein_g)}g protein · {Math.round(result.carbs_g)}g carbs · {Math.round(result.fat_g)}g fat</p>
          {result.ai_notes && <p className="border-t border-edge pt-2 text-sm text-[#c9d4e0]">{result.ai_notes}</p>}
        </div>
      )}
    </div>
  );
}
