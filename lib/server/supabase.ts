import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Two Supabase clients, both used only on the server:
 *
 * - Reader (SUPABASE_PUBLISHABLE_KEY, sb_publishable_...): what the website uses to read case studies.
 *   It can only do what the RLS policy allows: read published case studies. Safe to share with the team.
 * - Admin (SUPABASE_SECRET_KEY, sb_secret_...): used only by the monthly sync to write. It bypasses
 *   RLS, so it lives only in .env.local and Vercel, never in the browser, Teams, screenshots or Git.
 *   Never give it a NEXT_PUBLIC_ prefix.
 *
 * Both return null when their variables are missing, so the site still starts (with no case studies).
 */

/** Tag on cached case-study reads; the sync calls revalidateTag(CASE_STUDIES_CACHE_TAG). */
export const CASE_STUDIES_CACHE_TAG = "case-studies";
/** Tag on cached rebate reads; the monthly rebate sync calls revalidateTag(REBATES_CACHE_TAG). */
export const REBATES_CACHE_TAG = "rebates";
/** Cached reads refresh at least daily even without a sync. */
export const CASE_STUDIES_REVALIDATE_SECONDS = 24 * 60 * 60;

const authOptions = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

let reader: SupabaseClient | null | undefined;
let rebateReader: SupabaseClient | null | undefined;
let admin: SupabaseClient | null | undefined;

export function getSupabaseReader(): SupabaseClient | null {
  if (reader !== undefined) return reader;
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  reader =
    url && key
      ? createClient(url, key, {
          auth: authOptions,
          global: {
            // Let Next.js cache these reads for a day; the sync clears the cache when data changes.
            fetch: (input, init) =>
              fetch(input, {
                ...init,
                next: { revalidate: CASE_STUDIES_REVALIDATE_SECONDS, tags: [CASE_STUDIES_CACHE_TAG] },
              } as RequestInit),
          },
        })
      : null;
  return reader;
}

export function getSupabaseRebatesReader(): SupabaseClient | null {
  if (rebateReader !== undefined) return rebateReader;
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  rebateReader =
    url && key
      ? createClient(url, key, {
          auth: authOptions,
          global: {
            fetch: (input, init) =>
              fetch(input, {
                ...init,
                next: { revalidate: CASE_STUDIES_REVALIDATE_SECONDS, tags: [REBATES_CACHE_TAG] },
              } as RequestInit),
          },
        })
      : null;
  return rebateReader;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (typeof window !== "undefined") throw new Error("getSupabaseAdmin() must only run on the server");
  if (admin !== undefined) return admin;
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  admin =
    url && key
      ? createClient(url, key, {
          auth: authOptions,
          // Writes and sync checks must never be served from a cache.
          global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
        })
      : null;
  return admin;
}

/** Tests only: forget the cached clients after changing environment variables. */
export function resetSupabaseClientsForTests(): void {
  reader = undefined;
  rebateReader = undefined;
  admin = undefined;
}
