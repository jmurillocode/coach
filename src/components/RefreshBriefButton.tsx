"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RefreshBriefButton() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function refresh() {
    setBusy(true);
    try {
      await fetch("/api/coach/refresh", { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={refresh} disabled={busy} className="label hover:text-accent disabled:opacity-50">
      {busy ? "thinking…" : "↻ refresh"}
    </button>
  );
}
