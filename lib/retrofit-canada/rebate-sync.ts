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

const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
const FALLBACK_EXTRACTION_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];

const TRUSTED_EXACT_HOSTS = new Set([
  "abmunis.ca",
  "alberta.ca",
  "bchydro.com",
  "betterhomesbc.ca",
  "calgary.ca",
  "canada.ca",
  "changeforclimate.ca",
  "cmhc-schl.gc.ca",
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
  ".cmhc-schl.gc.ca",
  ".alberta.ca",
  ".abmunis.ca",
  ".changeforclimate.ca",
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

export interface RegionTarget {
  code: string;
  label: string;
  sourceUrls?: string[];
}

const REGION_TARGETS: RegionTarget[] = [
  {
    code: "ALL",
    label: "Federal / Canada-wide residential retrofit loans and grants (such as Canada Greener Homes Loan, OHPA, Canada Greener Homes Affordability Program)",
    sourceUrls: [
      "https://www.canada.ca/en/environment-climate-change/services/energy-efficiency/home-energy-efficiency/canada-greener-homes-initiative.html",
      "https://www.canada.ca/en/environment-climate-change/services/energy-efficiency/home-energy-efficiency/canada-greener-homes-initiative/canada-greener-homes-loan.html",
      "https://www.canada.ca/en/environment-climate-change/services/energy-efficiency/home-energy-efficiency/canada-greener-homes-initiative/oil-heat-pump-affordability-program.html",
      "https://www.canada.ca/en/environment-climate-change/services/energy-efficiency/home-energy-efficiency/canada-greener-homes-initiative/canada-greener-homes-affordability-program.html",
    ],
  },
  {
    code: "AB",
    label: "Alberta & municipal residential retrofit programs (such as CEIP Alberta, Calgary, Edmonton Change Homes for Climate, utility rebates)",
    sourceUrls: [
      "https://ceip.abmunis.ca/",
      "https://www.calgary.ca/environment/programs/clean-energy-improvement-program.html",
      "https://homes.changeforclimate.ca/",
    ],
  },
  {
    code: "BC",
    label: "British Columbia residential retrofit rebates and loans (such as CleanBC Better Homes, BC Hydro, FortisBC)",
    sourceUrls: [
      "https://www.betterhomesbc.ca/",
      "https://www.bchydro.com/powersmart/residential/rebates-programs.html",
      "https://www.fortisbc.com/rebates-and-energy-savings/rebates-and-offers",
    ],
  },
  {
    code: "ON",
    label: "Ontario residential retrofit rebates and loans (such as Home Renovation Savings, Enbridge Gas, provincial programs)",
    sourceUrls: [
      "https://www.homerenovationsavings.ca/",
      "https://www.enbridgegas.com/ontario/rebates-energy-conservation",
    ],
  },
  {
    code: "NS",
    label: "Nova Scotia residential energy efficiency rebates and heat pump programs (Efficiency Nova Scotia)",
    sourceUrls: ["https://www.efficiencyns.ca/"],
  },
  {
    code: "MB",
    label: "Manitoba residential energy efficiency rebates and home upgrade programs (Efficiency Manitoba)",
    sourceUrls: ["https://www.efficiencymb.ca/"],
  },
];

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
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

class GeminiApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "GeminiApiError";
  }
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
  )}:generateContent`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify(body),
    });

    if (res.ok) {
      return (await res.json()) as GeminiGenerateResponse;
    }

    const detail = await res.text().catch(() => "");
    if (attempt === 0 && (res.status === 502 || res.status === 503 || res.status === 504)) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      continue;
    }

    throw new GeminiApiError(
      res.status,
      `Gemini rebate scan returned HTTP ${res.status}${detail ? `: ${detail.slice(0, 250)}` : ""}`
    );
  }

  throw new GeminiApiError(503, "Gemini rebate scan failed after retry");
}

function extractGeminiText(response: GeminiGenerateResponse): string {
  return (response.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text ?? "")
    .join("")
    .trim();
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&ndash;|&#8211;/gi, "-")
    .replace(/&mdash;|&#8212;/gi, "-")
    .replace(/\s+/g, " ")
    .trim();
}

interface FetchedOfficialPage {
  regionCode: string;
  url: string;
  text: string;
}

async function fetchOfficialPages(
  targets: RegionTarget[],
  fetchImpl: typeof fetch,
  timeoutMs: number
): Promise<FetchedOfficialPage[]> {
  const jobs: Array<{ regionCode: string; url: string }> = [];
  for (const target of targets) {
    const urls = target.sourceUrls ?? [];
    for (const url of urls) {
      if (isTrustedProgramUrl(url)) {
        jobs.push({ regionCode: target.code, url });
      }
    }
  }

  const settled = await Promise.allSettled(
    jobs.map(async ({ regionCode, url }): Promise<FetchedOfficialPage | null> => {
      const res = await fetchImpl(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(Math.min(timeoutMs, 12_000)),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; RetrofitCanadaBot/1.0)" },
      });
      if (!res.ok || res.status === 202) return null;
      const finalUrl = res.url && isTrustedProgramUrl(res.url) ? res.url : url;
      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : "";
      if (/^(page\s+not\s+found|not\s+found|404|radware|access\s+denied)/i.test(title)) {
        return null;
      }
      const text = stripHtmlToText(html);
      if (text.length < 200) return null;
      return { regionCode, url: finalUrl, text: text.slice(0, 3500) };
    })
  );

  return settled
    .filter(
      (item): item is PromiseFulfilledResult<FetchedOfficialPage | null> =>
        item.status === "fulfilled" && item.value !== null
    )
    .map((item) => item.value!);
}

function normalizeRawPrograms(
  items: RawGeminiRebateItem[],
  fallbackProvince: string,
  extraSourceUrls: string[]
): ScannedRebateProgram[] {
  const normalized: ScannedRebateProgram[] = [];
  for (const item of items) {
    const name = item.name?.trim();
    const url = item.url?.trim() ?? "";
    if (!name || !isTrustedProgramUrl(url)) continue;

    const province = (item.province?.trim().toUpperCase() || fallbackProvince).slice(0, 3);
    const level: RebateLevel =
      item.level && VALID_LEVELS.has(item.level as RebateLevel)
        ? (item.level as RebateLevel)
        : province === "ALL"
          ? "Federal"
          : "Provincial";

    const status: RebateStatus =
      item.status && VALID_STATUSES.has(item.status as RebateStatus)
        ? (item.status as RebateStatus)
        : "active";

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
      sourceUrls: Array.from(new Set([url, ...extraSourceUrls])).slice(0, 6),
      status,
    });
  }

  return normalized;
}

async function extractProgramsFromOfficialPages(
  targets: RegionTarget[],
  pages: FetchedOfficialPage[],
  apiKey: string,
  model: string,
  fetchImpl: typeof fetch,
  timeoutMs: number
): Promise<ScannedRebateProgram[]> {
  if (pages.length === 0) {
    throw new Error("Could not fetch any live official rebate pages.");
  }

  const targetList = targets.map((t) => `- ${t.code}: ${t.label}`).join("\n");
  const sourceExcerpts = pages
    .map((p) => `### [${p.regionCode}] ${p.url}\n${p.text}`)
    .join("\n\n");

  const promptText = `Extract residential home energy-efficiency retrofit rebates, grants, and clean-energy financing programs from the live official Canadian government, municipal, and utility web pages below.
Return JSON matching:
{
  "programs": [
    {
      "slug": "short-kebab-slug",
      "name": "Official Program Name",
      "level": "Federal" | "Provincial" | "Municipal" | "Utility",
      "province": "ALL" | "AB" | "BC" | "ON" | "NS" | "MB",
      "city": null,
      "summary": "1-2 sentence plain summary",
      "estimatedValue": "e.g. Up to $40,000 (0% APR loan) or Measure dependent",
      "eligibilityNotes": "Key eligibility condition and intake note",
      "eligibleUpgrades": ["Heat Pump", "Insulation", "Air Sealing"],
      "url": "https://exact-source-url-from-above",
      "status": "active" | "waitlist" | "closed"
    }
  ]
}

Target regions:
${targetList}

Rules:
- Extract each distinct residential retrofit grant, rebate, or financing program covered by the live pages below (including federal, provincial, municipal, utility, and programs whose intake has closed). Do not invent dollar amounts or URLs.
- Every "url" MUST be one of the official https:// URLs provided below (or a direct trusted subdomain path from the page).
- Set "status" to "closed" if the page states new applications are closed; set "waitlist" if paused/waitlisted; otherwise "active".
- For federal programs use province "ALL"; for provincial/municipal/utility programs use the matching 2-letter province code.

Live official pages:
${sourceExcerpts}`;

  const candidates = Array.from(new Set([model, ...FALLBACK_EXTRACTION_MODELS]));
  let jsonResponse: GeminiGenerateResponse | undefined;
  let lastError: unknown;

  for (const candidateModel of candidates) {
    try {
      jsonResponse = await callGemini(
        apiKey,
        candidateModel,
        {
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            ...(candidateModel.startsWith("gemini-3")
              ? { thinkingConfig: { thinkingLevel: "minimal" } }
              : {}),
          },
          contents: [
            {
              role: "user",
              parts: [{ text: promptText }],
            },
          ],
        },
        fetchImpl,
        Math.max(timeoutMs, 30_000)
      );
      break;
    } catch (err) {
      lastError = err;
      const isRetryableModelErr =
        (err instanceof GeminiApiError &&
          (err.status === 429 || err.status === 404 || err.status === 503)) ||
        (err instanceof Error && err.name === "TimeoutError");
      if (!isRetryableModelErr) throw err;
    }
  }

  if (!jsonResponse) {
    throw lastError instanceof Error ? lastError : new Error("Gemini rebate extraction failed.");
  }

  const rawJsonText = extractGeminiText(jsonResponse);
  if (!rawJsonText) return [];

  const parsed = JSON.parse(rawJsonText) as { programs?: RawGeminiRebateItem[] };
  const items = Array.isArray(parsed.programs) ? parsed.programs : [];
  const fetchedUrls = pages.map((p) => p.url);
  return normalizeRawPrograms(items, targets[0]?.code ?? "ALL", fetchedUrls);
}

function isGroundingFallbackStatus(err: unknown): err is GeminiApiError {
  return (
    err instanceof GeminiApiError &&
    (err.status === 429 || err.status === 403 || err.status === 400)
  );
}

async function scanRebatesViaGrounding(
  region: RegionTarget,
  options: RebateScanOptions = {}
): Promise<ScannedRebateProgram[]> {
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY?.trim() ?? "";
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  const model = options.model ?? (process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL);
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 25_000;

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

  const searchText = extractGeminiText(searchResponse);

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

  const rawJsonText = extractGeminiText(jsonResponse);
  if (!rawJsonText) return [];

  const parsed = JSON.parse(rawJsonText) as { programs?: RawGeminiRebateItem[] };
  const items = Array.isArray(parsed.programs) ? parsed.programs : [];
  return normalizeRawPrograms(items, region.code, groundingUrls);
}

export async function scanRebatesForRegion(
  region: RegionTarget,
  options: RebateScanOptions = {}
): Promise<ScannedRebateProgram[]> {
  try {
    return await scanRebatesViaGrounding(region, options);
  } catch (err) {
    if (!isGroundingFallbackStatus(err)) throw err;
    const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY?.trim() ?? "";
    const model = options.model ?? (process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL);
    const fetchImpl = options.fetchImpl ?? fetch;
    const timeoutMs = options.timeoutMs ?? 25_000;
    const target =
      region.sourceUrls?.length
        ? region
        : REGION_TARGETS.find((r) => r.code === region.code) ?? region;
    const pages = await fetchOfficialPages([target], fetchImpl, timeoutMs);
    return await extractProgramsFromOfficialPages(
      [target],
      pages,
      apiKey,
      model,
      fetchImpl,
      timeoutMs
    );
  }
}

export async function scanAllCanadianRebates(
  options: RebateScanOptions = {}
): Promise<ScannedRebateProgram[]> {
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY?.trim() ?? "";
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  const model = options.model ?? (process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL);
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 25_000;
  const useSearchGrounding = process.env.GEMINI_SEARCH_GROUNDING === "true";

  const bySlug = new Map<string, ScannedRebateProgram>();
  const addPrograms = (programs: ScannedRebateProgram[]) => {
    for (const prog of programs) {
      if (!bySlug.has(prog.slug)) {
        bySlug.set(prog.slug, prog);
      }
    }
  };

  if (!useSearchGrounding) {
    const pages = await fetchOfficialPages(REGION_TARGETS, fetchImpl, timeoutMs);
    const programs = await extractProgramsFromOfficialPages(
      REGION_TARGETS,
      pages,
      apiKey,
      model,
      fetchImpl,
      timeoutMs
    );
    addPrograms(programs);
    return Array.from(bySlug.values());
  }

  for (let i = 0; i < REGION_TARGETS.length; i++) {
    try {
      const programs = await scanRebatesViaGrounding(REGION_TARGETS[i], options);
      addPrograms(programs);
    } catch (err) {
      // If Gemini Search Grounding isn't enabled or hits quota mid-way, scan remaining regions in one batch from official pages.
      if (!isGroundingFallbackStatus(err)) throw err;
      const remaining = REGION_TARGETS.slice(i);
      const pages = await fetchOfficialPages(remaining, fetchImpl, timeoutMs);
      const programs = await extractProgramsFromOfficialPages(
        remaining,
        pages,
        apiKey,
        model,
        fetchImpl,
        timeoutMs
      );
      addPrograms(programs);
      break;
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
