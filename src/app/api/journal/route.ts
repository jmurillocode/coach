import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const insert = await admin()
    .from("journal_entries")
    .insert({
      entry_at: body.entry_at ?? new Date().toISOString(),
      mood: body.mood ?? null,
      energy: body.energy ?? null,
      soreness: body.soreness ?? null,
      stress: body.stress ?? null,
      body_weight_kg: body.body_weight_kg ?? null,
      note: body.note ?? null,
      tags: body.tags ?? [],
    })
    .select()
    .single();

  if (insert.error) {
    return NextResponse.json({ error: insert.error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, entry: insert.data });
}

export async function GET() {
  const { data, error } = await admin()
    .from("journal_entries")
    .select("*")
    .order("entry_at", { ascending: false })
    .limit(30);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data });
}
