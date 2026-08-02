import { NextRequest, NextResponse } from "next/server";
import { admin, FOOD_BUCKET } from "@/lib/supabase";

export const runtime = "nodejs";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = admin();
  const { data } = await db.from("meals").select("photo_path").eq("id", params.id).maybeSingle();
  if (data?.photo_path) {
    await db.storage.from(FOOD_BUCKET).remove([data.photo_path]);
  }
  const { error } = await db.from("meals").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const allowed = ["title", "calories_est", "protein_g", "carbs_g", "fat_g", "user_note", "meal_type", "portion_assessment"];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (body && body[k] !== undefined && body[k] !== null) patch[k] = body[k];
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }
  const { error } = await admin().from("meals").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
