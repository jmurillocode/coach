"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DOT: Record<string, string> = {
  easy: "#46E5A0", long: "#4FD3E0", workout: "#F5B544", strength: "#C58BF0", cross: "#8A949E", rest: "#3A434D",
};
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekPlanEditor({ sessions, weekStart }: { sessions: any[]; weekStart: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const weekDates = DAYS.map((_, i) => {
    const d = new Date(`${weekStart}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });

  async function move(id: string, day_date: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/plan/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, day_date }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "failed");
      setOpenId(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {sessions.map((s) => {
        const wd = (new Date(`${s.day_date}T00:00:00.000Z`).getUTCDay() + 6) % 7;
        const open = openId === s.id;
        return (
          <div key={s.id}>
            <div className="flex items-center gap-3">
              <span className="mlab w-8 shrink-0">{DAYS[wd]}</span>
              <span className="flex flex-1 items-center gap-2 text-sm">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: DOT[s.session_type] ?? "#8A949E" }} />
                <span className="truncate">{s.title ?? s.session_type}</span>
                {s.status === "modified" && <span className="text-[10px] text-warn">moved</span>}
              </span>
              <span className="num text-xs text-muted">{s.planned_distance_km ? `${s.planned_distance_km}km` : ""}</span>
              <button onClick={() => setOpenId(open ? null : s.id)} aria-label="Reschedule" className="px-1 text-muted hover:text-accent">↔</button>
            </div>
            {open && (
              <div className="mt-2 flex flex-wrap gap-1 pl-11">
                {DAYS.map((d, i) => (
                  <button
                    key={d}
                    disabled={busy || i === wd}
                    onClick={() => move(s.id, weekDates[i])}
                    className={`rounded-lg px-2.5 py-1.5 text-xs ${
                      i === wd ? "bg-edge text-white" : "border border-edge text-muted hover:border-accent hover:text-accent"
                    } disabled:opacity-40`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
