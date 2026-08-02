import { anthropic, MODEL, extractJson } from "./anthropic";
import type { MealItem } from "./types";

export type MealAnalysis = {
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

export async function analyzeMealText(text: string): Promise<MealAnalysis> {
  const msg = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: `${PROMPT}\n\nMeal: ${text}` }],
  });
  const t = msg.content.find((c) => c.type === "text");
  return extractJson<MealAnalysis>(t && "text" in t ? t.text : "");
}
