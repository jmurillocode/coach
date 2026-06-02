import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service-role key.
// This app is single-user; all DB access happens server-side. Never import this
// into a client component.

let cached: SupabaseClient | null = null;

export function admin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars"
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Bypass Next.js's Data Cache — always read fresh from the DB.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
  return cached;
}

export const FOOD_BUCKET = process.env.SUPABASE_FOOD_BUCKET || "food-photos";
