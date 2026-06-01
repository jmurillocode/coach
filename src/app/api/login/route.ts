import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, sessionToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { passcode } = await req.json().catch(() => ({ passcode: "" }));
  const expected = process.env.APP_PASSCODE;
  if (!expected) {
    return NextResponse.json({ error: "APP_PASSCODE not set" }, { status: 500 });
  }
  if (!passcode || passcode !== expected) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }
  const token = await sessionToken(passcode);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
