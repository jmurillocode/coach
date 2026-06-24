import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase";
import { runAgent } from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 60;

const REVIEW_TASK = `Weekly review. Look at my last 7 days — recovery/sleep trend, how many planned sessions I actually completed (compare upcoming_plan and this_week_actual / workouts), and whether I'm trending up or struggling. Then ADJUST next week's plan with the tools if needed: scale volume down if I'm under-recovered or missed a lot, hold or nudge up if I'm on track and recovered. Make targeted edits, not a rebuild. Finish with a short summary (4-6 sentences): how the week went, and exactly what you changed for next week and why.`;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}

async function run(req: NextRequest) {
  // Automated path only (Vercel cron with Bearer secret). The manual "review my
  // week" button in the app just sends the review prompt through /api/chat instead.
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAgent([{ role: "user", content: REVIEW_TASK }], "This is the automated weekly review — be proactive about adjusting next week.");
    const db = admin();
    await db.from("chat_messages").insert({
      role: "assistant",
      content: `📋 Weekly review\n\n${result.text}`,
      meta: result.actions.length ? { actions: result.actions, kind: "weekly_review" } : { kind: "weekly_review" },
    });
    await db.from("coaching_briefs").insert({
      brief_date: new Date().toISOString().slice(0, 10),
      kind: "weekly",
      title: "Weekly review",
      body: result.text,
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    });
    return NextResponse.json({ ok: true, actions: result.actions });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "review failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return run(req);
}
export async function POST(req: NextRequest) {
  return run(req);
}
