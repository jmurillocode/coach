import { admin } from "./supabase";
import { anthropic, MODEL } from "./anthropic";
import { getTargets } from "./nutrition";
import { getWeekStats } from "./training";

// Gathers recent data and asks Claude for a daily coaching brief.

const SYSTEM = `You are Jon's personal endurance coach. You are evidence-based, calm, encouraging, and honest.
Context on the athlete you must always respect:
- 39, ~95kg/180cm, rebuilding fitness toward the Chicago Marathon (Oct 11 2026). 3-month no-travel reset.
- Real engine (career bests: 20:50 5k, 1:39 half, ~3:54 marathon set while INJURED). His true ceiling is higher than his times show.
- FAILURE MODE: goes out too fast and lacks strength/durability -> late-race and injury breakdowns (muscular/tendon).
- Therefore the priorities are: (1) DISCIPLINED easy pace (keep easy runs truly easy by heart rate, not pace ego), (2) strength & mobility (bodyweight/bands; no gym), (3) portion control (his eating problem is QUANTITY, stress-driven, not food quality).
- Tracking: Whoop (recovery/sleep/HRV) worn 24/7; Garmin for runs. Coach off recovery, not just the plan.

Write a SHORT daily brief (120-220 words) in markdown. Structure:
- A one-line headline on how today looks.
- 2-4 sentences interpreting today's recovery/sleep and recent training & nutrition trends.
- A clear recommendation for today's session (adjust intensity/volume to recovery; if recovery is low, say so and scale back). Use weekly_training_stats to note if volume is tracking the Chicago plan.
- One small nutrition nudge grounded in nutrition_targets (daily kcal/protein goal for ~0.7kg/week loss) and what's been logged — e.g. protein short, portion creep, or fuel up before a long run.
Be specific and reference the actual numbers you're given. Never invent data you weren't given. Avoid hype and avoid bullet-point overload.`;

export async function buildDailyBrief(): Promise<{ title: string; body: string }> {
  const db = admin();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const threeDaysAgo = new Date(Date.now() - 3 * 86400_000).toISOString();

  const [profile, metrics, workouts, meals, journal, plan] = await Promise.all([
    db.from("profile").select("*").eq("id", 1).maybeSingle(),
    db.from("daily_metrics").select("*").order("metric_date", { ascending: false }).limit(8),
    db.from("workouts").select("*").gte("start_time", weekAgo).order("start_time", { ascending: false }),
    db.from("meals").select("eaten_at, meal_type, calories_est, protein_g, portion_assessment, ai_notes").gte("eaten_at", threeDaysAgo).order("eaten_at", { ascending: false }),
    db.from("journal_entries").select("*").gte("entry_at", weekAgo).order("entry_at", { ascending: false }),
    db.from("training_plan").select("*").gte("day_date", today).order("day_date", { ascending: true }).limit(3),
  ]);

  const [targets, weekStats] = await Promise.all([getTargets(), getWeekStats()]);

  const context = {
    today,
    profile: profile.data ?? null,
    nutrition_targets: targets,
    weekly_training_stats: weekStats,
    recent_daily_metrics: metrics.data ?? [],
    workouts_last_7d: workouts.data ?? [],
    meals_last_3d: meals.data ?? [],
    journal_last_7d: journal.data ?? [],
    upcoming_plan: plan.data ?? [],
  };

  const msg = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 700,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Here is today's data as JSON. Write the daily brief.\n\n${JSON.stringify(context, null, 2)}`,
      },
    ],
  });

  const textBlock = msg.content.find((c) => c.type === "text");
  const body = textBlock && "text" in textBlock ? textBlock.text.trim() : "No brief generated.";
  const title = `Daily brief · ${today}`;
  return { title, body };
}

export async function generateAndStoreDailyBrief(): Promise<{ id: string; title: string; body: string }> {
  const { title, body } = await buildDailyBrief();
  const today = new Date().toISOString().slice(0, 10);
  const db = admin();

  // One brief per day: delete any existing daily brief for today, then insert.
  await db.from("coaching_briefs").delete().eq("brief_date", today).eq("kind", "daily");
  const ins = await db
    .from("coaching_briefs")
    .insert({ brief_date: today, kind: "daily", title, body, model: MODEL })
    .select()
    .single();
  if (ins.error) throw new Error(ins.error.message);
  return { id: ins.data.id, title, body };
}
