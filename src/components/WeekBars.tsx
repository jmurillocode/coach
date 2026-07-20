"use client";

import { useState } from "react";

function label(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Interactive weekly-volume bars: hover (desktop) or tap (mobile) a week to read its planned km.
export function WeekBars({ weeks, currentIndex }: { weeks: { week_start: string; km: number }[]; currentIndex: number }) {
  const [active, setActive] = useState<number | null>(null);
  if (!weeks.length) return null;
  const max = Math.max(...weeks.map((w) => w.km), 1);
  const focus = active ?? currentIndex;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="mlab">{active != null ? `week of ${label(weeks[active].week_start)}` : "the build → Chicago"}</span>
        <span className="num text-xs text-dim">{focus >= 0 ? `${weeks[focus].km} km` : `${max} km peak`}</span>
      </div>
      <div className="flex h-[52px] items-end gap-1">
        {weeks.map((w, i) => {
          const on = i === (active ?? currentIndex);
          return (
            <button
              key={w.week_start}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(active === i ? null : i)}
              aria-label={`Week of ${label(w.week_start)}: ${w.km} km`}
              className="flex h-full flex-1 flex-col justify-end"
            >
              <div
                className="w-full rounded-[2px]"
                style={{ height: `${Math.max(8, (w.km / max) * 100)}%`, background: on ? "#F5B544" : "#2C343D" }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
