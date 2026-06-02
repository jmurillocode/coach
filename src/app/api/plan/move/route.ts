import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase";

export const runtime = "nodejs";

// Move a planned session to a different day. Protected by the app passcode (middleware).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;
  const day_date = body?.day_date as string | undefined;
  if (!id || !day_date) {
    return NextResponse.json({ error: "id and day_date required" }, { status: 400 });
  }

  // No RETURNING/select — just update and use the affected-row count.
  const { error, count } = await admin()
    .from("training_plan")
    .update({ day_date, status: "modified" }, { count: "exact" })
    .eq("id", id);

  if (error) {
    const msg = error.message || "";
    if ((error as any).code === "23505" || msg.toLowerCase().includes("duplicate")) {
      return NextResponse.json(
        { error: "That day already has a session of this type. Move or swap that one first." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  if (!count) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
