import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase";
import { analyzeMealText } from "@/lib/food";

export const runtime = "nodejs";
export const maxDuration = 60;

// Re-analyze an existing meal from corrected text and overwrite its nutrition.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const text = (body?.text as string | undefined)?.trim();
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  let a;
  try {
    a = await analyzeMealText(text);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "analysis error" }, { status: 500 });
  }

  const { error } = await admin()
    .from("meals")
    .update({
      title: a.title ?? text.slice(0, 80),
      ai_items: a.items ?? [],
      calories_est: Math.round(a.calories_est ?? 0),
      protein_g: a.protein_g ?? null,
      carbs_g: a.carbs_g ?? null,
      fat_g: a.fat_g ?? null,
      portion_assessment: a.portion_assessment ?? null,
      ai_notes: a.notes ?? null,
      user_note: text,
    })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
