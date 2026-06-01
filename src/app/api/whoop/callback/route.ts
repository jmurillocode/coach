import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/whoop";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = req.cookies.get("whoop_state")?.value;

  if (!code) {
    return NextResponse.redirect(new URL("/?whoop=error_no_code", url.origin));
  }
  if (!state || state !== savedState) {
    return NextResponse.redirect(new URL("/?whoop=error_state", url.origin));
  }

  try {
    await exchangeCode(code);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.redirect(
      new URL(`/?whoop=error&msg=${encodeURIComponent(msg)}`, url.origin)
    );
  }

  // Kick off an initial sync, then land on the dashboard.
  return NextResponse.redirect(new URL("/?whoop=connected", url.origin));
}
