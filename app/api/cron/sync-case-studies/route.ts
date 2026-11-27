import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { syncCaseStudies } from "@/lib/retrofit-canada/sync";
import { CASE_STUDIES_CACHE_TAG, getSupabaseAdmin } from "@/lib/server/supabase";

// Never cache or pre-render this route; it must run every time it is called.
export const dynamic = "force-dynamic";
// Downloading 52 case studies takes ~15 s; allow up to 60 s.
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false; // no secret configured = nobody may run the sync
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/**
 * Copies Retrofit Canada's case studies into Supabase.
 *
 * Vercel Cron calls this daily (vercel.json) with `Authorization: Bearer <CRON_SECRET>`.
 * It only downloads when the last successful sync is 30+ days old, so Retrofit Canada's API is
 * called about once a month, and a failed month is retried the next day.
 *
 * Run it yourself: `npm run sync:case-studies` (needs `npm run dev` running), or Vercel →
 * Settings → Cron Jobs → Run. Add `?force=1` to skip the 30-day wait.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json(
      { error: "Supabase is not configured (SUPABASE_URL / SUPABASE_SECRET_KEY)." },
      { status: 503 }
    );
  }

  const force = request.nextUrl.searchParams.get("force") === "1";
  const isVercelCron = (request.headers.get("user-agent") ?? "").includes("vercel-cron");
  const result = await syncCaseStudies(db, { force, trigger: isVercelCron ? "cron" : "manual" });

  if (result.status === "success") {
    // Show the new data right away instead of waiting for the daily refresh. The data is already
    // saved, so a failure here only delays the pages; don't turn it into an error response.
    try {
      revalidateTag(CASE_STUDIES_CACHE_TAG);
      revalidatePath("/case-studies");
      revalidatePath("/case-studies/[id]", "page");
    } catch (err) {
      console.warn("[sync-case-studies] Saved, but could not refresh cached pages:", err);
    }
  } else if (result.status === "failed") {
    console.error("[sync-case-studies]", result.message);
  }

  return NextResponse.json(result, { status: result.status === "failed" ? 502 : 200 });
}
