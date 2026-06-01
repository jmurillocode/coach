import { NextRequest, NextResponse } from "next/server";
import { generateAndStoreDailyBrief } from "@/lib/coach";
import { syncWhoop } from "@/lib/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

async function run(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 1) Refresh Whoop data first (best-effort — don't fail the brief if not connected).
  let sync = null;
  try {
    sync = await syncWhoop(14);
  } catch (e) {
    sync = { skipped: e instanceof Error ? e.message : "sync skipped" };
  }

  // 2) Generate today's coaching brief.
  try {
    const brief = await generateAndStoreDailyBrief();
    return NextResponse.json({ ok: true, sync, brief: { id: brief.id, title: brief.title } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "brief failed";
    return NextResponse.json({ ok: false, sync, error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return run(req);
}
export async function POST(req: NextRequest) {
  return run(req);
}
