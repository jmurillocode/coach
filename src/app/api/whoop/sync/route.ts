import { NextRequest, NextResponse } from "next/server";
import { syncWhoop } from "@/lib/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const daysBack = Number(req.nextUrl.searchParams.get("days") ?? "14");
  try {
    const result = await syncWhoop(Number.isFinite(daysBack) ? daysBack : 14);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// Allow GET for convenience (e.g. manual trigger in the browser).
export async function GET(req: NextRequest) {
  return POST(req);
}
