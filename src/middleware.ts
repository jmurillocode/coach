import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, isValidToken } from "@/lib/auth";

// Gate everything except the login page, the login API, cron endpoints
// (protected by their own CRON_SECRET), static assets, and the manifest.
const PUBLIC_PATHS = [
  "/login",
  "/api/login",
  "/api/cron",
  // OAuth callback comes from whoop.com (cross-site) so the app session cookie
  // isn't reliable here. It's protected by the OAuth `state` check instead.
  "/api/whoop/callback",
  "/manifest.json",
  "/icons",
  "/favicon.ico",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (await isValidToken(token)) {
    return NextResponse.next();
  }

  // For API calls, return 401; for pages, redirect to /login.
  if (pathname.startsWith("/api/")) {
    return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
