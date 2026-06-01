import { NextResponse } from "next/server";
import { generateAndStoreDailyBrief } from "@/lib/coach";
import { syncWhoop } from "@/lib/sync";

// Manual "refresh my brief now" — protected by the app passcode via middleware.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  let sync = null;
  try {
    sync = await syncWhoop(14);
  } catch (e) {
    sync = { skipped: e instanceof Error ? e.message : "sync skipped" };
  }
  try {
    const brief = await generateAndStoreDailyBrief();
    return NextResponse.json({ ok: true, sync, brief });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "brief failed";
    return NextResponse.json({ ok: false, sync, error: msg }, { status: 500 });
  }
}
