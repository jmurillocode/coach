import { admin } from "./supabase";

// Whoop OAuth + API helpers. Docs: https://developer.whoop.com
const WHOOP_BASE = "https://api.prod.whoop.com";
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
  const tok = await postToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: env("WHOOP_CLIENT_ID"),
    client_secret: env("WHOOP_CLIENT_SECRET"),
    scope: WHOOP_SCOPES,
  });
  await storeToken(tok);
  return tok;
}

async function storeToken(tok: TokenResponse): Promise<void> {
  const expiresAt = new Date(Date.now() + tok.expires_in * 1000).toISOString();
  await admin()
    .from("integrations")
    .upsert(
      {
        provider: "whoop",
        access_token: tok.access_token,
        refresh_token: tok.refresh_token,
        expires_at: expiresAt,
        scope: tok.scope,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider" }
    );
}

export async function getValidAccessToken(): Promise<string> {
  const { data, error } = await admin()
    .from("integrations")
    .select("access_token, refresh_token, expires_at")
    .eq("provider", "whoop")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Whoop is not connected yet");

  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0;
  // Refresh if expiring within 60s.
  if (Date.now() > expiresAt - 60_000) {
    if (!data.refresh_token) throw new Error("No Whoop refresh token; reconnect");
    const tok = await refresh(data.refresh_token);
    return tok.access_token;
  }
  return data.access_token as string;
}

export async function whoopGet<T = unknown>(
  path: string,
  query: Record<string, string> = {}
): Promise<T> {
  const token = await getValidAccessToken();
  const qs = new URLSearchParams(query).toString();
  const res = await fetch(`${WHOOP_BASE}${path}${qs ? `?${qs}` : ""}`, {
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
