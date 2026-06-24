import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase";
import { whoopGet } from "@/lib/whoop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Diagnostic: compares the stored token + DB state against what Whoop returns live.
export async function GET() {
  const db = admin();
  const out: Record<string, unknown> = { now: new Date().toISOString() };

  const intg = await db
    .from("integrations")
    .select("expires_at, scope, access_token, refresh_token, updated_at")
    .eq("provider", "whoop")
    .maybeSingle();
  out.integration = intg.data
    ? {
        has_access: !!intg.data.access_token,
        has_refresh: !!intg.data.refresh_token,
        expires_at: intg.data.expires_at,
        expired: intg.data.expires_at ? new Date(intg.data.expires_at).getTime() < Date.now() : null,
        token_updated_at: intg.data.updated_at,
        scope: intg.data.scope,
      }
    : "NO WHOOP TOKEN — not connected";

  const latest = await db
    .from("daily_metrics")
    .select("metric_date, recovery_score, updated_at")
    .order("metric_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  out.db_latest = latest.data ?? null;

  const maxUpd = await db
    .from("daily_metrics")
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  out.db_last_sync = maxUpd.data?.updated_at ?? null;

  try {
    const rec = await whoopGet<{ records: any[] }>("/v2/recovery", { limit: "1" });
    const r = rec.records?.[0];
    out.whoop_live = r
      ? {
          created_at: r.created_at,
          date: String(r.created_at || "").slice(0, 10),
          score_state: r.score_state,
          recovery_score: r.score?.recovery_score ?? null,
        }
      : { records: 0 };
  } catch (e) {
    out.whoop_live_ERROR = e instanceof Error ? e.message : "error";
  }

  return NextResponse.json(out);
}
