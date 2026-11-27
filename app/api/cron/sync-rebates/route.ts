import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { resetRebatesCacheForTests } from "@/lib/rebates";
import { syncRebatePrograms } from "@/lib/retrofit-canada/rebate-sync";
import { REBATES_CACHE_TAG, getSupabaseAdmin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/**
 * Scans official Canadian government/utility sites via Gemini Google Search Grounding
 * and updates public.rebate_programs at most once every 30 days.
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
  const result = await syncRebatePrograms(db, {
    force,
    trigger: isVercelCron ? "cron" : "manual",
  });

  if (result.status === "success") {
    resetRebatesCacheForTests();
    try {
      revalidateTag(REBATES_CACHE_TAG);
      revalidatePath("/retrofit-ai");
    } catch (err) {
      console.warn("[sync-rebates] Saved, but could not refresh cache:", err);
    }
  } else if (result.status === "failed") {
    console.error("[sync-rebates]", result.message);
  }

  return NextResponse.json(result, { status: result.status === "failed" ? 502 : 200 });
}
