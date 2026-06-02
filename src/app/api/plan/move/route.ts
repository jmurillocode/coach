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

  const { data, error } = await admin()
    .from("training_plan")
    .update({ day_date, status: "modified" })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    // 23505 = unique (day_date, session_type) collision
    if ((error as any).code === "23505") {
      return NextResponse.json(
        { error: "That day already has a session of this type. Move or swap that one first." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, session: data });
}
