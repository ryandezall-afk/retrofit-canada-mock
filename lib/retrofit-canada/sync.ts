import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllCaseStudies, type ClientOptions } from "./client";
import { toCaseStudyRow } from "./mapper";
import type { RcCaseStudy } from "./types";

/** Retrofit Canada is called at most once per this many days (unless forced). */
export const SYNC_INTERVAL_DAYS = 30;
/** A sync still marked "running" after this long is treated as crashed. */
const STALE_RUN_MINUTES = 15;
/** Refuse to unpublish more than half the case studies in one go: likely an API problem. */
const MAX_DEACTIVATE_SHARE = 0.5;

const DAY_MS = 24 * 60 * 60 * 1000;

export type SyncResult =
  | { status: "skipped"; reason: string; lastSuccessAt?: string; nextDueAt?: string }
  | {
      status: "success";
      runId: number;
      fetched: number;
      inserted: number;
      updated: number;
      unchanged: number;
      deactivated: number;
    }
  | { status: "failed"; runId?: number; message: string };

export interface SyncOptions {
  /** Ignore the 30-day wait (first fill, or testing). */
  force?: boolean;
  trigger?: "cron" | "manual";
  now?: Date;
  /** Passed to the API client (tests inject a fake fetch). */
  client?: ClientOptions;
  /** Injected in tests instead of calling the API. */
  fetchCaseStudies?: () => Promise<RcCaseStudy[]>;
}

function contentHash(raw: RcCaseStudy): string {
  return createHash("sha256").update(JSON.stringify(raw)).digest("hex");
}

/**
 * Copies every published Retrofit Canada case study into public.case_studies.
 *
 * 1. Skip if the last successful sync was less than 30 days ago (or another sync is running).
 * 2. Download all case studies. If any download fails, stop without changing the table.
 * 3. Insert new ones, update changed ones, and mark ones the API no longer lists as inactive.
 * 4. Log the run in public.sync_runs.
 *
 * `db` must use the secret key (service_role): the website's public key can only read.
 */
export async function syncCaseStudies(db: SupabaseClient, options: SyncOptions = {}): Promise<SyncResult> {
  const now = options.now ?? new Date();

  // 1. Is a sync due?
  const { data: lastRuns, error: lastRunsError } = await db
    .from("sync_runs")
    .select("id,status,started_at")
    .order("started_at", { ascending: false })
    .limit(20);
  if (lastRunsError) return { status: "failed", message: `Reading sync_runs failed: ${lastRunsError.message}` };

  const running = (lastRuns ?? []).find(
    (run) => run.status === "running" && now.getTime() - Date.parse(run.started_at) < STALE_RUN_MINUTES * 60_000
  );
  if (running) return { status: "skipped", reason: "Another sync is already running." };

  const lastSuccess = (lastRuns ?? []).find((run) => run.status === "success");
  if (lastSuccess && !options.force) {
    const nextDue = Date.parse(lastSuccess.started_at) + SYNC_INTERVAL_DAYS * DAY_MS;
    if (now.getTime() < nextDue) {
      return {
        status: "skipped",
        reason: `Last successful sync was less than ${SYNC_INTERVAL_DAYS} days ago.`,
        lastSuccessAt: lastSuccess.started_at,
        nextDueAt: new Date(nextDue).toISOString(),
      };
    }
  }

  const { data: run, error: runError } = await db
    .from("sync_runs")
    .insert({ started_at: now.toISOString(), status: "running", trigger: options.trigger ?? "cron" })
    .select("id")
    .single();
  if (runError || !run) return { status: "failed", message: `Creating sync run failed: ${runError?.message}` };

  const fail = async (message: string): Promise<SyncResult> => {
    await db
      .from("sync_runs")
      .update({ status: "failed", finished_at: new Date().toISOString(), error: message.slice(0, 2000) })
      .eq("id", run.id);
    return { status: "failed", runId: run.id, message };
  };

  try {
    // 2. Download everything first.
    const records = await (options.fetchCaseStudies ?? (() => fetchAllCaseStudies(options.client)))();
    if (records.length === 0) return await fail("The API returned no case studies; nothing was changed.");

    const ids = new Set<number>();
    const slugs = new Set<string>();
    for (const record of records) {
      if (ids.has(record.id) || slugs.has(record.urlSlug)) {
        return await fail(`The API returned case study ${record.id} (${record.urlSlug}) twice; nothing was changed.`);
      }
      ids.add(record.id);
      slugs.add(record.urlSlug);
    }

    // 3. Compare with what we already have.
    const { data: existing, error: existingError } = await db
      .from("case_studies")
      .select("id,content_hash,is_active,updated_at");
    if (existingError) return await fail(`Reading case_studies failed: ${existingError.message}`);
    const byId = new Map((existing ?? []).map((row) => [row.id as number, row]));

    const activeBefore = (existing ?? []).filter((row) => row.is_active).map((row) => row.id as number);
    const toDeactivate = activeBefore.filter((id) => !ids.has(id));
    if (activeBefore.length > 0 && toDeactivate.length > activeBefore.length * MAX_DEACTIVATE_SHARE) {
      return await fail(
        `The API returned ${records.length} case studies but ${toDeactivate.length} of ${activeBefore.length} ` +
          "published ones are missing. That looks like an API problem, so nothing was changed."
      );
    }

    const syncedAt = now.toISOString();
    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    const rows = records.map((raw) => {
      const hash = contentHash(raw);
      const previous = byId.get(raw.id);
      if (!previous) inserted++;
      else if (previous.content_hash !== hash) updated++;
      else unchanged++;
      return {
        ...toCaseStudyRow(raw),
        raw,
        content_hash: hash,
        is_active: true,
        last_seen_at: syncedAt,
        updated_at: previous && previous.content_hash === hash ? previous.updated_at : syncedAt,
      };
    });

    const { error: upsertError } = await db.from("case_studies").upsert(rows, { onConflict: "id" });
    if (upsertError) return await fail(`Saving case studies failed: ${upsertError.message}`);

    if (toDeactivate.length > 0) {
      const { error: deactivateError } = await db
        .from("case_studies")
        .update({ is_active: false })
        .in("id", toDeactivate);
      if (deactivateError) return await fail(`Unpublishing removed case studies failed: ${deactivateError.message}`);
    }

    // 4. Log it.
    const counts = { fetched: records.length, inserted, updated, unchanged, deactivated: toDeactivate.length };
    await db
      .from("sync_runs")
      .update({ status: "success", finished_at: new Date().toISOString(), ...counts })
      .eq("id", run.id);
    return { status: "success", runId: run.id, ...counts };
  } catch (err) {
    return await fail(err instanceof Error ? err.message : String(err));
  }
}
