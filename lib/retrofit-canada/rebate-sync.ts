import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Rebate programs are scanned at most once per this many days (unless forced). */
export const REBATE_SYNC_INTERVAL_DAYS = 30;
const STALE_RUN_MINUTES = 15;
const MAX_DEACTIVATE_SHARE = 0.5;
const DAY_MS = 24 * 60 * 60 * 1000;

export type RebateLevel = "Federal" | "Provincial" | "Municipal" | "Utility";
export type RebateStatus = "active" | "waitlist" | "closed";

export interface ScannedRebateProgram {
  slug: string;
  name: string;
  level: RebateLevel;
  province: string;
  city?: string | null;
  summary: string;
  estimatedValue: string;
  eligibilityNotes: string;
  eligibleUpgrades: string[];
  url: string;
  sourceUrls: string[];
  status: RebateStatus;
}

export type RebateSyncResult =
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

export interface RebateScanOptions {
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface RebateSyncOptions {
  force?: boolean;
  trigger?: "cron" | "manual";
  now?: Date;
  scanOptions?: RebateScanOptions;
  /** Injected in tests instead of calling Gemini. */
  scanRebates?: () => Promise<ScannedRebateProgram[]>;
}

const TRUSTED_EXACT_HOSTS = new Set([
  "abmunis.ca",
  "alberta.ca",
  "bchydro.com",
  "betterhomesbc.ca",
  "calgary.ca",
  "canada.ca",
  "edmonton.ca",
  "efficiencymb.ca",
  "efficiencyns.ca",
  "enbridgegas.com",
  "fortisbc.com",
  "homerenovationsavings.ca",
  "hydroquebec.com",
  "nbpower.com",
  "ontario.ca",
  "ottawa.ca",
  "princeedwardisland.ca",
  "quebec.ca",
  "retrofitcanada.com",
  "saskatchewan.ca",
  "saskenergy.com",
  "saskpower.com",
  "takechargenl.ca",
  "toronto.ca",
  "vancouver.ca",
]);

const TRUSTED_HOST_SUFFIXES = [
  ".canada.ca",
  ".gc.ca",
  ".alberta.ca",
  ".abmunis.ca",
  ".gov.bc.ca",
  ".gov.ab.ca",
  ".gov.on.ca",
  ".gov.sk.ca",
  ".gov.mb.ca",
  ".gov.ns.ca",
  ".gov.nb.ca",
  ".gov.pe.ca",
  ".gov.nl.ca",
  ".gov.nt.ca",
  ".gov.yk.ca",
  ".gouv.qc.ca",
  ".betterhomesbc.ca",
  ".homerenovationsavings.ca",
  ".efficiencyns.ca",
  ".efficiencymb.ca",
  ".bchydro.com",
  ".fortisbc.com",
  ".hydroquebec.com",
  ".enbridgegas.com",
  ".saskpower.com",
  ".saskenergy.com",
  ".nbpower.com",
  ".takechargenl.ca",
  ".retrofitcanada.com",
  ".calgary.ca",
  ".edmonton.ca",
  ".ontario.ca",
  ".quebec.ca",
  ".saskatchewan.ca",
  ".princeedwardisland.ca",
];

/** Verifies a URL uses HTTPS and points to an official Canadian government, municipal, or utility domain. */
export function isTrustedProgramUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (TRUSTED_EXACT_HOSTS.has(host)) return true;
    return TRUSTED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
  } catch {
    return false;
  }
}

const VALID_LEVELS = new Set<RebateLevel>(["Federal", "Provincial", "Municipal", "Utility"]);
const VALID_STATUSES = new Set<RebateStatus>(["active", "waitlist", "closed"]);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

interface RegionTarget {
  code: string;
  label: string;
}

const REGION_TARGETS: RegionTarget[] = [
  { code: "ALL", label: "Federal / Canada-wide residential retrofit loans and grants (such as Canada Greener Homes Loan, OHPA)" },
  { code: "AB", label: "Alberta & municipal residential retrofit programs (such as CEIP Alberta, Calgary, Edmonton, utility rebates)" },
  { code: "BC", label: "British Columbia residential retrofit rebates and loans (such as CleanBC Better Homes, BC Hydro, FortisBC)" },
  { code: "ON", label: "Ontario residential retrofit rebates and loans (such as Home Renovation Savings, Enbridge, provincial programs)" },
];

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: {
      groundingChunks?: Array<{
        web?: { uri?: string; title?: string };
      }>;
    };
  }>;
}

interface RawGeminiRebateItem {
  slug?: string;
  name?: string;
  level?: string;
  province?: string;
  city?: string | null;
  summary?: string;
  estimatedValue?: string;
  eligibilityNotes?: string;
  eligibleUpgrades?: unknown;
  url?: string;
  status?: string;
}

async function callGemini(
  apiKey: string,
  model: string,
  body: Record<string, unknown>,
  fetchImpl: typeof fetch,
  timeoutMs: number
): Promise<GeminiGenerateResponse> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetchImpl(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Gemini rebate scan returned HTTP ${res.status}`);
  }
  return (await res.json()) as GeminiGenerateResponse;
}

export async function scanRebatesForRegion(
  region: RegionTarget,
  options: RebateScanOptions = {}
): Promise<ScannedRebateProgram[]> {
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY?.trim() ?? "";
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  const model = options.model ?? (process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash");
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 20_000;

  // Step 1: Grounded Google Search for currently open/closed programs
  const searchResponse = await callGemini(
    apiKey,
    model,
    {
      tools: [{ google_search: {} }],
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                `Search official Canadian government, municipal, and utility websites for currently active residential energy-efficiency retrofits, heat pump grants, insulation/window rebates, and clean energy loans for: ${region.label}. ` +
                "Note clearly whether each program is currently active, on waitlist, or closed to new applicants. Include exact official program URLs.",
            },
          ],
        },
      ],
    },
    fetchImpl,
    timeoutMs
  );

  const searchText =
    searchResponse.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("\n")
      .trim() ?? "";

  const groundingUrls = (
    searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []
  )
    .map((chunk) => chunk.web?.uri?.trim() ?? "")
    .filter((uri) => isTrustedProgramUrl(uri));

  if (!searchText) return [];

  // Step 2: Format into structured JSON
  const jsonResponse = await callGemini(
    apiKey,
    model,
    {
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Convert the verified findings below into JSON:
{
  "programs": [
    {
      "slug": "short-kebab-slug",
      "name": "Official Program Name",
      "level": "Federal" | "Provincial" | "Municipal" | "Utility",
      "province": "${region.code}",
      "city": null,
      "summary": "1-2 sentence plain summary",
      "estimatedValue": "e.g. Up to $40,000 (0% APR loan)",
      "eligibilityNotes": "Key eligibility condition",
      "eligibleUpgrades": ["Heat Pump", "Insulation", "Air Sealing"],
      "url": "https://official-url",
      "status": "active" | "waitlist" | "closed"
    }
  ]
}
Rules:
- Only include real residential retrofit grants, rebates, or clean-energy loans.
- Every "url" MUST be an official https:// government, municipal, or utility URL (never a contractor blog).
- Use province "${region.code}" for this batch.

Search findings:
${searchText}

Trusted grounding URLs:
${JSON.stringify(groundingUrls)}`,
            },
          ],
        },
      ],
    },
    fetchImpl,
    timeoutMs
  );

  const rawJsonText =
    jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  if (!rawJsonText) return [];

  const parsed = JSON.parse(rawJsonText) as { programs?: RawGeminiRebateItem[] };
  const items = Array.isArray(parsed.programs) ? parsed.programs : [];

  const normalized: ScannedRebateProgram[] = [];
  for (const item of items) {
    const name = item.name?.trim();
    const url = item.url?.trim() ?? "";
    if (!name || !isTrustedProgramUrl(url)) continue;

    const level: RebateLevel =
      item.level && VALID_LEVELS.has(item.level as RebateLevel)
        ? (item.level as RebateLevel)
        : region.code === "ALL"
          ? "Federal"
          : "Provincial";

    const status: RebateStatus =
      item.status && VALID_STATUSES.has(item.status as RebateStatus)
        ? (item.status as RebateStatus)
        : "active";

    const province = (item.province?.trim().toUpperCase() || region.code).slice(0, 3);
    const slug = slugify(item.slug?.trim() || `${province}-${name}`);
    if (!slug) continue;

    normalized.push({
      slug,
      name,
      level,
      province,
      city: item.city?.trim() || null,
      summary: item.summary?.trim() || name,
      estimatedValue: item.estimatedValue?.trim() || "Program dependent",
      eligibilityNotes:
        item.eligibilityNotes?.trim() ||
        "Verify current intake and pre-retrofit audit rules on the official program page.",
      eligibleUpgrades: Array.isArray(item.eligibleUpgrades)
        ? item.eligibleUpgrades.filter((u): u is string => typeof u === "string" && Boolean(u.trim()))
        : [],
      url,
      sourceUrls: Array.from(new Set([url, ...groundingUrls])).slice(0, 6),
      status,
    });
  }

  return normalized;
}

export async function scanAllCanadianRebates(
  options: RebateScanOptions = {}
): Promise<ScannedRebateProgram[]> {
  const bySlug = new Map<string, ScannedRebateProgram>();
  for (const region of REGION_TARGETS) {
    const programs = await scanRebatesForRegion(region, options);
    for (const prog of programs) {
      if (!bySlug.has(prog.slug)) {
        bySlug.set(prog.slug, prog);
      }
    }
  }
  return Array.from(bySlug.values());
}

function contentHash(prog: ScannedRebateProgram): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        name: prog.name,
        level: prog.level,
        province: prog.province,
        city: prog.city ?? null,
        summary: prog.summary,
        estimatedValue: prog.estimatedValue,
        eligibilityNotes: prog.eligibilityNotes,
        eligibleUpgrades: prog.eligibleUpgrades,
        url: prog.url,
        status: prog.status,
      })
    )
    .digest("hex");
}

/**
 * Scans official Canadian retrofit grant/loan programs via Gemini Google Search Grounding
 * and saves them into public.rebate_programs at most once every 30 days.
 */
export async function syncRebatePrograms(
  db: SupabaseClient,
  options: RebateSyncOptions = {}
): Promise<RebateSyncResult> {
  const now = options.now ?? new Date();

  const { data: lastRuns, error: lastRunsError } = await db
    .from("sync_runs")
    .select("id,status,started_at")
    .eq("sync_type", "rebates")
    .order("started_at", { ascending: false })
    .limit(20);
  if (lastRunsError) {
    return { status: "failed", message: `Reading sync_runs failed: ${lastRunsError.message}` };
  }

  const running = (lastRuns ?? []).find(
    (run) =>
      run.status === "running" &&
      now.getTime() - Date.parse(run.started_at) < STALE_RUN_MINUTES * 60_000
  );
  if (running) {
    return { status: "skipped", reason: "Another rebate sync is already running." };
  }

  const lastSuccess = (lastRuns ?? []).find((run) => run.status === "success");
  if (lastSuccess && !options.force) {
    const nextDue = Date.parse(lastSuccess.started_at) + REBATE_SYNC_INTERVAL_DAYS * DAY_MS;
    if (now.getTime() < nextDue) {
      return {
        status: "skipped",
        reason: `Last successful rebate sync was less than ${REBATE_SYNC_INTERVAL_DAYS} days ago.`,
        lastSuccessAt: lastSuccess.started_at,
        nextDueAt: new Date(nextDue).toISOString(),
      };
    }
  }

  const { data: run, error: runError } = await db
    .from("sync_runs")
    .insert({
      started_at: now.toISOString(),
      status: "running",
      trigger: options.trigger ?? "cron",
      sync_type: "rebates",
    })
    .select("id")
    .single();
  if (runError || !run) {
    return { status: "failed", message: `Creating sync run failed: ${runError?.message}` };
  }

  const fail = async (message: string): Promise<RebateSyncResult> => {
    await db
      .from("sync_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error: message.slice(0, 2000),
      })
      .eq("id", run.id);
    return { status: "failed", runId: run.id, message };
  };

  try {
    const programs = await (options.scanRebates ??
      (() => scanAllCanadianRebates(options.scanOptions)))();

    if (programs.length === 0) {
      return await fail("Gemini rebate scan returned no valid trusted programs; nothing changed.");
    }

    const activeSlugs = new Set(
      programs.filter((p) => p.status !== "closed").map((p) => p.slug)
    );

    const { data: existing, error: existingError } = await db
      .from("rebate_programs")
      .select("slug,content_hash,is_active,updated_at");
    if (existingError) {
      return await fail(`Reading rebate_programs failed: ${existingError.message}`);
    }

    const bySlug = new Map((existing ?? []).map((row) => [row.slug as string, row]));
    const activeBefore = (existing ?? [])
      .filter((row) => row.is_active)
      .map((row) => row.slug as string);
    const toDeactivate = activeBefore.filter((slug) => !activeSlugs.has(slug));

    if (
      activeBefore.length > 0 &&
      toDeactivate.length > activeBefore.length * MAX_DEACTIVATE_SHARE
    ) {
      return await fail(
        `Scan returned ${activeSlugs.size} active programs, dropping ${toDeactivate.length} of ${activeBefore.length}; refusing to unpublish.`
      );
    }

    const syncedAt = now.toISOString();
    let inserted = 0;
    let updated = 0;
    let unchanged = 0;

    const rows = programs.map((prog) => {
      const hash = contentHash(prog);
      const prev = bySlug.get(prog.slug);
      if (!prev) inserted++;
      else if (prev.content_hash !== hash) updated++;
      else unchanged++;

      return {
        slug: prog.slug,
        name: prog.name,
        level: prog.level,
        province: prog.province,
        city: prog.city ?? null,
        summary: prog.summary,
        estimated_value: prog.estimatedValue,
        eligibility_notes: prog.eligibilityNotes,
        eligible_upgrades: prog.eligibleUpgrades,
        url: prog.url,
        source_urls: prog.sourceUrls,
        status: prog.status,
        content_hash: hash,
        is_active: prog.status !== "closed",
        last_verified_at: syncedAt,
        updated_at: prev && prev.content_hash === hash ? prev.updated_at : syncedAt,
      };
    });

    const { error: upsertError } = await db
      .from("rebate_programs")
      .upsert(rows, { onConflict: "slug" });
    if (upsertError) {
      return await fail(`Saving rebate_programs failed: ${upsertError.message}`);
    }

    const missingSlugs = activeBefore.filter(
      (slug) => !programs.some((p) => p.slug === slug)
    );
    if (missingSlugs.length > 0) {
      const { error: deactivateError } = await db
        .from("rebate_programs")
        .update({ is_active: false, status: "closed", updated_at: syncedAt })
        .in("slug", missingSlugs);
      if (deactivateError) {
        return await fail(`Deactivating closed programs failed: ${deactivateError.message}`);
      }
    }

    const counts = {
      fetched: programs.length,
      inserted,
      updated,
      unchanged,
      deactivated: toDeactivate.length,
    };
    await db
      .from("sync_runs")
      .update({ status: "success", finished_at: new Date().toISOString(), ...counts })
      .eq("id", run.id);

    return { status: "success", runId: run.id, ...counts };
  } catch (err) {
    return await fail(err instanceof Error ? err.message : String(err));
  }
}
