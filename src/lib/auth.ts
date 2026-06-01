// Minimal single-user auth: one passcode gates the app. After login we set an
// httpOnly cookie whose value is sha256(passcode). Works in both Edge (middleware)
// and Node (route handlers) via Web Crypto.

export const COOKIE_NAME = "coach_session";

export async function sessionToken(passcode: string): Promise<string> {
  const data = new TextEncoder().encode(`coach::${passcode}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function expectedToken(): Promise<string> {
  const pass = process.env.APP_PASSCODE;
  if (!pass) throw new Error("Missing APP_PASSCODE env var");
  return sessionToken(pass);
}

export async function isValidToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const expected = await expectedToken();
  // constant-time-ish compare
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
