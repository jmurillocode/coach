import { admin } from "./supabase";

// Whoop OAuth + API helpers. Docs: https://developer.whoop.com
// OAuth lives at the root; the REST data API (v2) lives under /developer.
const WHOOP_BASE = "https://api.prod.whoop.com";
const WHOOP_API_BASE = "https://api.prod.whoop.com/developer";
const AUTH_URL = `${WHOOP_BASE}/oauth/oauth2/auth`;
const TOKEN_URL = `${WHOOP_BASE}/oauth/oauth2/token`;

export const WHOOP_SCOPES = [
  "read:recovery",
  "read:sleep",
  "read:workout",
  "read:cycles",
  "read:profile",
  "offline", // required to receive a refresh_token
].join(" ");

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} env var`);
  return v;
}

export function authUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env("WHOOP_CLIENT_ID"),
    redirect_uri: env("WHOOP_REDIRECT_URI"),
    scope: WHOOP_SCOPES,
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

async function postToken(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Whoop token error ${res.status}: ${t}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function exchangeCode(code: string): Promise<void> {
  const tok = await postToken({
    grant_type: "authorization_code",
    code,
    client_id: env("WHOOP_CLIENT_ID"),
    client_secret: env("WHOOP_CLIENT_SECRET"),
    redirect_uri: env("WHOOP_REDIRECT_URI"),
  });
  await storeToken(tok);
}

async function refresh(refreshToken: string): Promise<TokenResponse> {
  // Whoop's refresh grant requires scope "offline" (NOT the full read scopes,
  // which it rejects as a 400 invalid_request). Docs: developer.whoop.com/docs/developing/oauth
  const tok = await postToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: env("WHOOP_CLIENT_ID"),
    client_secret: env("WHOOP_CLIENT_SECRET"),
    scope: "offline",
  });
  await storeToken(tok);
  return tok;
}

async function storeToken(tok: TokenResponse): Promise<void> {
  const expiresAt = new Date(Date.now() + tok.expires_in * 1000).toISOString();
  const row: Record<string, unknown> = {
    provider: "whoop",
    access_token: tok.access_token,
    expires_at: expiresAt,
    scope: tok.scope,
    updated_at: new Date().toISOString(),
  };
  // Only overwrite the refresh token if Whoop returned a new one — never wipe it.
  if (tok.refresh_token) row.refresh_token = tok.refresh_token;
  await admin().from("integrations").upsert(row, { onConflict: "provider" });
}

export async function getValidAccessToken(): Promise<string> {
  const db = admin();
  const { data, error } = await db
    .from("integrations")
    .select("access_token, refresh_token, expires_at, updated_at")
    .eq("provider", "whoop")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Whoop is not connected yet");

  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0;
  if (Date.now() <= expiresAt - 90_000) return data.access_token as string;
  if (!data.refresh_token) throw new Error("No Whoop refresh token; reconnect");

  // Serialize refreshes: atomically "claim" the refresh via optimistic lock on
  // updated_at. Only the claimer refreshes; concurrent callers wait and re-read.
  const claim = await db
    .from("integrations")
    .update({ updated_at: new Date().toISOString() })
    .eq("provider", "whoop")
    .eq("updated_at", data.updated_at)
    .select("refresh_token")
    .maybeSingle();

  if (claim.data) {
    const tok = await refresh(claim.data.refresh_token as string);
    return tok.access_token;
  }

  // Another request is refreshing — wait briefly, then use the freshly stored token.
  await new Promise((r) => setTimeout(r, 2500));
  const re = await db.from("integrations").select("access_token").eq("provider", "whoop").maybeSingle();
  if (re.data?.access_token) return re.data.access_token as string;
  throw new Error("Whoop token unavailable after concurrent refresh");
}

export async function whoopGet<T = unknown>(
  path: string,
  query: Record<string, string> = {}
): Promise<T> {
  const token = await getValidAccessToken();
  const qs = new URLSearchParams(query).toString();
  const res = await fetch(`${WHOOP_API_BASE}${path}${qs ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Whoop API ${res.status} on ${path}: ${t}`);
  }
  return (await res.json()) as T;
}

export async function isConnected(): Promise<boolean> {
  const { data } = await admin()
    .from("integrations")
    .select("provider")
    .eq("provider", "whoop")
    .maybeSingle();
  return !!data;
}
