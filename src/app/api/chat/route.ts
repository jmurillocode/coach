import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase";
import { runAgent, type ChatMsg } from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 60;

// GET → recent chat history
export async function GET() {
  const { data, error } = await admin()
    .from("chat_messages")
    .select("id, role, content, meta, created_at")
    .order("created_at", { ascending: true })
    .limit(60);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data });
}

// POST { message } → run the coach agent, persist both turns
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const message = (body?.message as string | undefined)?.trim();
  if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });

  const db = admin();
  // Load recent history for context (last 20 turns).
  const { data: hist } = await db
    .from("chat_messages")
    .select("role, content")
    .order("created_at", { ascending: false })
    .limit(20);
  const history: ChatMsg[] = (hist ?? []).reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  history.push({ role: "user", content: message });

  await db.from("chat_messages").insert({ role: "user", content: message });

  let result;
  try {
    result = await runAgent(history);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "agent error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  await db.from("chat_messages").insert({
    role: "assistant",
    content: result.text,
    meta: result.actions.length ? { actions: result.actions } : {},
  });

  return NextResponse.json({ text: result.text, actions: result.actions });
}
