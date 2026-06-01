import { NextRequest, NextResponse } from "next/server";
import { admin, FOOD_BUCKET } from "@/lib/supabase";
import { anthropic, MODEL, extractJson } from "@/lib/anthropic";
import type { MealItem } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  image_base64: string; // raw base64, no data: prefix
  media_type?: "image/jpeg" | "image/png" | "image/webp";
  meal_type?: string;
  user_note?: string;
};

type Analysis = {
  items: MealItem[];
  calories_est: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  portion_assessment: "small" | "moderate" | "large" | "very_large";
  notes: string;
};

const PROMPT = `You are a sports nutritionist estimating the nutrition of a meal from a single photo.
Be realistic and avoid over- or under-counting. If unsure about quantity, assume a typical adult serving.
The athlete's main issue is PORTION SIZE, so judge the portion honestly relative to a typical serving.

Return ONLY a JSON object, no prose, in exactly this shape:
{
  "items": [
    {"name": "string", "portion": "e.g. '1 cup' or '~200g'", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}
  ],
  "calories_est": number,           // total
  "protein_g": number,              // total
  "carbs_g": number,                // total
  "fat_g": number,                  // total
  "portion_assessment": "small" | "moderate" | "large" | "very_large",
  "notes": "one or two sentences, coach tone, on what this meal is doing for training/weight goals"
}`;

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!body.image_base64) {
    return NextResponse.json({ error: "image_base64 required" }, { status: 400 });
  }
  const mediaType = body.media_type ?? "image/jpeg";

  // 1) Store the photo.
  const ext = mediaType.split("/")[1] || "jpg";
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
  const bytes = Buffer.from(body.image_base64, "base64");
  const db = admin();
  const up = await db.storage.from(FOOD_BUCKET).upload(path, bytes, {
    contentType: mediaType,
    upsert: false,
  });
  if (up.error) {
    return NextResponse.json(
      { error: `storage upload failed: ${up.error.message}` },
      { status: 500 }
    );
  }
  const signed = await db.storage.from(FOOD_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);

  // 2) Analyze with Claude vision.
  let analysis: Analysis;
  try {
    const msg = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: body.image_base64 } },
            { type: "text", text: PROMPT + (body.user_note ? `\n\nAthlete note: ${body.user_note}` : "") },
          ],
        },
      ],
    });
    const text = msg.content.find((c) => c.type === "text");
    analysis = extractJson<Analysis>(text && "text" in text ? text.text : "");
  } catch (e) {
    const m = e instanceof Error ? e.message : "vision error";
    return NextResponse.json({ error: `analysis failed: ${m}` }, { status: 500 });
  }

  // 3) Persist the meal.
  const insert = await db
    .from("meals")
    .insert({
      eaten_at: new Date().toISOString(),
      meal_type: body.meal_type ?? null,
      photo_path: path,
      photo_url: signed.data?.signedUrl ?? null,
      ai_items: analysis.items ?? [],
      calories_est: Math.round(analysis.calories_est ?? 0),
      protein_g: analysis.protein_g ?? null,
      carbs_g: analysis.carbs_g ?? null,
      fat_g: analysis.fat_g ?? null,
      portion_assessment: analysis.portion_assessment ?? null,
      ai_notes: analysis.notes ?? null,
      user_note: body.user_note ?? null,
    })
    .select()
    .single();

  if (insert.error) {
    return NextResponse.json({ error: insert.error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, meal: insert.data });
}
