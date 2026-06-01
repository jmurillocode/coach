import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase";
import { anthropic, MODEL, extractJson } from "@/lib/anthropic";
import type { MealItem } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = { text: string; meal_type?: string };

type Analysis = {
  title: string;
  items: MealItem[];
  calories_est: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  portion_assessment: "small" | "moderate" | "large" | "very_large";
  notes: string;
};

const PROMPT = `You are a sports nutritionist estimating the nutrition of a meal from a short text description.
Be realistic. If quantity isn't stated, assume a typical adult serving. The athlete's main issue is PORTION SIZE,
so judge the portion honestly. Return ONLY a JSON object in exactly this shape:
{
  "title": "short label, e.g. 'Chicken, rice & salad'",
  "items": [{"name": "string", "portion": "string", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}],
  "calories_est": number, "protein_g": number, "carbs_g": number, "fat_g": number,
  "portion_assessment": "small" | "moderate" | "large" | "very_large",
  "notes": "one or two coach-tone sentences on what this meal does for training/weight goals"
}`;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.text?.trim()) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  let a: Analysis;
  try {
    const msg = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: `${PROMPT}\n\nMeal: ${body.text}` }],
    });
    const t = msg.content.find((c) => c.type === "text");
    a = extractJson<Analysis>(t && "text" in t ? t.text : "");
  } catch (e) {
    const m = e instanceof Error ? e.message : "analysis error";
    return NextResponse.json({ error: m }, { status: 500 });
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
