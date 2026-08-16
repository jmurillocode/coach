import { admin } from "./supabase";
import { anthropic, MODEL } from "./anthropic";
import { getTargets, getDayNutrition } from "./nutrition";
import { getWeekStats, mondayOf } from "./training";

export type ChatMsg = { role: "user" | "assistant"; content: string };

const SYSTEM = `You are Jon's personal endurance coach, living inside his training app. You are direct, evidence-based, and you talk to him as a capable peer (sub-4 marathoner) — never patronizing.

About Jon: 39, rebuilding toward the Chicago Marathon (Sun Oct 11 2026). Runs Mon/Wed/Thu/Sat/Sun; Tue/Fri are cross-training (bike/swim) + strength & mobility. His failure mode is going out too hard and weak posterior-chain/durability -> late-race & injury breakdowns, so the priorities are disciplined EASY pace (by HR), strength+mobility, and portion control. Plan follows the official NRC Chicago structure (Sat long, Wed speed, recovery runs) at a ~80km peak.

You can READ his live data (given below) and you can MODIFY his training plan using the provided tools. Guidance for plan edits:
- Always call get_sessions first to see exact ids/dates before changing anything.
- Respect his running days (Mon/Wed/Thu/Sat/Sun) and the rule that each day can hold at most one session of a given type.
- Be conservative and explain WHY you changed something. Don't rebuild the whole plan unless asked — make targeted edits.
- When he asks to move a session, change a distance/pace, swap a workout, or scale a week up/down, do it with the tools, then confirm in plain language what you changed.
- To REBUILD one or more whole weeks: call get_sessions to see the range, then delete_range to clear it in ONE call, then add_sessions to insert the new sessions in ONE bulk call. NEVER delete or add sessions one at a time for a rebuild.
- CRITICAL: to perform any action you MUST emit the tool call in the same turn. Never reply "now deleting…" or "about to update…" without actually calling the tool — that does nothing. Act, then report what you did.
- If he just wants advice, answer directly — don't touch the plan.
Keep replies tight and practical. Reference his actual numbers when relevant.`;

const TOOLS = [
  {
    name: "get_sessions",
    description: "Read planned training sessions between two dates (inclusive). Returns id, date, type, title, distance, pace, status.",
    input_schema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "YYYY-MM-DD" },
        end_date: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "update_session",
    description: "Update fields on an existing session (found via get_sessions). Only pass fields you want to change.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        day_date: { type: "string", description: "move to this date (YYYY-MM-DD)" },
        title: { type: "string" },
        planned_distance_km: { type: "number" },
        planned_duration_min: { type: "number" },
        target_pace: { type: "string" },
        session_type: { type: "string", enum: ["easy", "long", "workout", "strength", "cross", "rest"] },
        coach_note: { type: "string" },
        status: { type: "string", enum: ["planned", "done", "skipped", "modified"] },
      },
      required: ["id"],
    },
  },
  {
    name: "add_session",
    description: "Add a new session on a date.",
    input_schema: {
      type: "object",
      properties: {
        day_date: { type: "string" },
        session_type: { type: "string", enum: ["easy", "long", "workout", "strength", "cross", "rest"] },
        title: { type: "string" },
        planned_distance_km: { type: "number" },
        planned_duration_min: { type: "number" },
        target_pace: { type: "string" },
        coach_note: { type: "string" },
      },
      required: ["day_date", "session_type", "title"],
    },
  },
  {
    name: "delete_session",
    description: "Delete a single session by id.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "delete_range",
    description:
      "Delete ALL sessions between two dates (inclusive) in one call. Use this to clear weeks before a rebuild — never delete sessions one-by-one.",
    input_schema: {
      type: "object",
      properties: { start_date: { type: "string" }, end_date: { type: "string" } },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "add_sessions",
    description:
      "Bulk-insert many sessions at once. Use this to build weeks after delete_range. Each session needs day_date, session_type, title; distance/pace/note optional.",
    input_schema: {
      type: "object",
      properties: {
        sessions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day_date: { type: "string" },
              session_type: { type: "string", enum: ["easy", "long", "workout", "strength", "cross", "rest"] },
              title: { type: "string" },
              planned_distance_km: { type: "number" },
              planned_duration_min: { type: "number" },
              target_pace: { type: "string" },
              coach_note: { type: "string" },
            },
            required: ["day_date", "session_type", "title"],
          },
        },
      },
      required: ["sessions"],
    },
  },
];

async function gatherContext() {
  const db = admin();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 8 * 86400_000).toISOString();
  const [profile, targets, metrics, workouts, nutrition, weekStats, plan] = await Promise.all([
    db.from("profile").select("*").eq("id", 1).maybeSingle(),
    getTargets(),
    db.from("daily_metrics").select("metric_date, recovery_score, hrv_rmssd_ms, resting_hr, sleep_performance, day_strain").order("metric_date", { ascending: false }).limit(10),
    db.from("workouts").select("sport, start_time, distance_m, duration_s, avg_pace_s_per_km, avg_hr").gte("start_time", weekAgo).order("start_time", { ascending: false }),
    getDayNutrition(),
    getWeekStats(),
    db.from("training_plan").select("day_date, session_type, title, planned_distance_km, target_pace, status").gte("day_date", today).order("day_date", { ascending: true }).limit(28),
  ]);
  return {
    today,
    profile: profile.data,
    nutrition_targets: targets,
    recent_recovery: metrics.data,
    workouts_last_week: workouts.data,
    nutrition_today: { consumed: nutrition.consumed, target_kcal: targets.daily_kcal },
    this_week_actual: weekStats,
    upcoming_plan_4wk: plan.data,
  };
}

async function executeTool(name: string, input: any, actions: string[]): Promise<unknown> {
  const db = admin();
  try {
    if (name === "get_sessions") {
      const { data, error } = await db
        .from("training_plan")
        .select("id, day_date, session_type, title, planned_distance_km, target_pace, status, coach_note")
        .gte("day_date", input.start_date)
        .lte("day_date", input.end_date)
        .order("day_date", { ascending: true });
      if (error) return { error: error.message };
      return { sessions: data };
    }
    if (name === "update_session") {
      const { id, ...fields } = input;
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null) clean[k] = v;
      clean.status = clean.status ?? "modified";
      const { error, count } = await db.from("training_plan").update(clean, { count: "exact" }).eq("id", id);
      if (error) {
        if ((error as any).code === "23505") return { error: "A session of that type already exists on that day. Move/swap it first." };
        return { error: error.message };
      }
      if (!count) return { error: "session not found" };
      actions.push(`updated session ${id}`);
      return { ok: true };
    }
    if (name === "add_session") {
      const { error } = await db.from("training_plan").insert({ ...input, status: "modified" });
      if (error) {
        if ((error as any).code === "23505") return { error: "A session of that type already exists on that day." };
        return { error: error.message };
      }
      actions.push(`added ${input.session_type} on ${input.day_date}`);
      return { ok: true };
    }
    if (name === "delete_session") {
      const { error } = await db.from("training_plan").delete().eq("id", input.id);
      if (error) return { error: error.message };
      actions.push(`deleted session ${input.id}`);
      return { ok: true };
    }
    if (name === "delete_range") {
      const { error, count } = await db
        .from("training_plan")
        .delete({ count: "exact" })
        .gte("day_date", input.start_date)
        .lte("day_date", input.end_date);
      if (error) return { error: error.message };
      actions.push(`cleared ${count ?? 0} sessions ${input.start_date}→${input.end_date}`);
      return { ok: true, deleted: count ?? 0 };
    }
    if (name === "add_sessions") {
      const list = (input.sessions ?? []).map((x: any) => ({ ...x, status: "modified" }));
      if (!list.length) return { error: "no sessions provided" };
      const { error } = await db.from("training_plan").insert(list);
      if (error) {
        if ((error as any).code === "23505") return { error: "One or more days already have a session of that type — clear the range first with delete_range." };
        return { error: error.message };
      }
      actions.push(`added ${list.length} sessions`);
      return { ok: true, added: list.length };
    }
    return { error: `unknown tool ${name}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "tool error" };
  }
}

export async function runAgent(history: ChatMsg[], systemExtra = ""): Promise<{ text: string; actions: string[] }> {
  const context = await gatherContext();
  const system = `${SYSTEM}\n\nLIVE CONTEXT (read-only snapshot):\n${JSON.stringify(context)}${systemExtra ? `\n\n${systemExtra}` : ""}`;
  const messages: any[] = history.map((m) => ({ role: m.role, content: m.content }));
  const actions: string[] = [];

  for (let i = 0; i < 10; i++) {
    const resp = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 1500,
      system,
      messages,
      tools: TOOLS as any,
    });
    const toolUses = resp.content.filter((c: any) => c.type === "tool_use");
    if (resp.stop_reason === "tool_use" && toolUses.length) {
      messages.push({ role: "assistant", content: resp.content });
      const results = [];
      for (const tu of toolUses as any[]) {
        const out = await executeTool(tu.name, tu.input, actions);
        results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(out) });
      }
      messages.push({ role: "user", content: results });
      continue;
    }
    const text = resp.content
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("\n")
      .trim();
    return { text: text || "Done.", actions };
  }
  return { text: "I made several edits but hit my step limit — ask me to confirm what changed.", actions };
}
