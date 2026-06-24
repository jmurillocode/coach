"use client";

import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";

type Msg = { role: "user" | "assistant"; content: string; meta?: { actions?: string[] } };

export default function CoachChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((j) => setMessages(j.messages ?? []))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "failed");
      setMessages((m) => [...m, { role: "assistant", content: json.text, meta: json.actions?.length ? { actions: json.actions } : undefined }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${e instanceof Error ? e.message : "error"}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-6rem)] flex-col px-4 pt-6">
      <h1 className="mb-3 text-2xl font-semibold">Coach</h1>

      <div className="flex-1 space-y-3">
        {loaded && messages.length === 0 && (
          <div className="card">
            <p className="text-sm text-dim">
              Ask me anything — training, nutrition, how to handle a rough week. I can also change your plan: try
              &quot;move Saturday&apos;s long run to Sunday&quot; or &quot;I&apos;m wiped, lighten this week.&quot;
            </p>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-2 text-sm text-ink">
              {m.content}
            </div>
          ) : (
            <div key={i} className="mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-edge bg-panel px-4 py-3">
              <Markdown text={m.content} />
              {m.meta?.actions?.length ? (
                <div className="mt-2 flex flex-wrap gap-1 border-t border-edge pt-2">
                  {m.meta.actions.map((a, j) => (
                    <span key={j} className="rounded-md bg-edge px-2 py-0.5 text-[10px] text-accent">✓ {a}</span>
                  ))}
                </div>
              ) : null}
            </div>
          )
        )}

        {busy && <div className="mr-auto rounded-2xl border border-edge bg-panel px-4 py-3 text-sm text-muted">thinking…</div>}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-24 mt-3 space-y-2 bg-ink/95 py-2 backdrop-blur">
        {messages.length === 0 && (
          <button onClick={() => send("Review my last week and adjust next week's plan accordingly.")} className="btn-ghost w-full text-sm">
            📋 Review my week & adjust next week
          </button>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your coach…"
            className="flex-1 rounded-xl border border-edge bg-panel px-4 py-3 text-sm outline-none focus:border-accent"
          />
          <button type="submit" disabled={busy || !input.trim()} className="btn-primary px-5 disabled:opacity-40">
            ↑
          </button>
        </form>
      </div>
    </main>
  );
}
