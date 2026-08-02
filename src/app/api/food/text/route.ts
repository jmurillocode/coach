import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase";
import { analyzeMealText } from "@/lib/food";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = { text: string; meal_type?: string };

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.text?.trim()) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  let a;
  try {
    a = await analyzeMealText(body.text);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "analysis error" }, { status: 500 });
  }

  const insert = await admin()
    .from("meals")
    .insert({
      eaten_at: new Date().toISOString(),
      meal_type: body.meal_type ?? null,
      entry_method: "text",
      title: a.title ?? body.text.slice(0, 80),
      ai_items: a.items ?? [],
      calories_est: Math.round(a.calories_est ?? 0),
      protein_g: a.protein_g ?? null,
      carbs_g: a.carbs_g ?? null,
      fat_g: a.fat_g ?? null,
      portion_assessment: a.portion_assessment ?? null,
      ai_notes: a.notes ?? null,
      user_note: body.text,
    })
    .select()
    .single();

  if (insert.error) return NextResponse.json({ error: insert.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, meal: insert.data });
}
