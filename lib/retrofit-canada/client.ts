import type {
  RcCaseStudy,
  RcCaseStudyListResponse,
  RcCaseStudyResponse,
} from "./types";

export const DEFAULT_RETROFIT_CANADA_API_BASE = "https://portal.retrofitcanada.com/api/v1";

export interface ClientOptions {
  /** Defaults to RETROFIT_CANADA_API_BASE or the public portal URL. */
  baseUrl?: string;
  /** Injected in tests. Defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** How many case studies to download at the same time. Keep it small to be polite. */
  concurrency?: number;
  timeoutMs?: number;
}

export class RetrofitCanadaApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "RetrofitCanadaApiError";
  }
}

function resolveBase(options: ClientOptions): string {
  const base = options.baseUrl ?? process.env.RETROFIT_CANADA_API_BASE?.trim() ?? "";
  return (base || DEFAULT_RETROFIT_CANADA_API_BASE).replace(/\/+$/, "");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** GET a JSON URL. Retries once on network errors, 429 and 5xx. */
async function getJson<T>(url: string, options: ClientOptions): Promise<T> {
  const fetchImpl = options.fetchImpl ?? fetch;
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetchImpl(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
        cache: "no-store",
      });
      if (res.ok) return (await res.json()) as T;

      lastError = new RetrofitCanadaApiError(`GET ${url} returned ${res.status}`, res.status);
      if (res.status !== 429 && res.status < 500) break; // 4xx won't fix itself
    } catch (err) {
      lastError = err;
    }
    if (attempt === 1) await sleep(1_000);
  }

  throw lastError instanceof Error ? lastError : new RetrofitCanadaApiError(String(lastError));
}

/** Runs `worker` over `items`, at most `limit` at a time, keeping the original order. */
async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

/**
 * Downloads every published case study with all of its fields.
 *
 * Step 1: GET /caseStudies lists the published case studies (basic fields only).
 * Step 2: GET /caseStudies/lookup/{slug} for each one gets the full record. The list alone isn't
 *         enough: it leaves out most fields and shows "Other" where the owner typed their own answer.
 *
 * Throws if the list or any case study can't be downloaded, so a sync never saves half the data.
 */
export async function fetchAllCaseStudies(options: ClientOptions = {}): Promise<RcCaseStudy[]> {
  const base = resolveBase(options);
  const list = await getJson<RcCaseStudyListResponse>(`${base}/caseStudies`, options);
  const items = list?.data?.caseStudies;
  if (!Array.isArray(items)) {
    throw new RetrofitCanadaApiError("Unexpected response from /caseStudies (no data.caseStudies array)");
  }

  return mapLimit(items, options.concurrency ?? 4, async (item) => {
    if (!item?.urlSlug) {
      throw new RetrofitCanadaApiError(`Case study ${item?.id ?? "?"} has no urlSlug`);
    }
    const url = `${base}/caseStudies/lookup/${encodeURIComponent(item.urlSlug)}`;
    const detail = await getJson<RcCaseStudyResponse>(url, options);
    const record = detail?.data?.caseStudy;
    if (!record || typeof record.id !== "number" || !record.urlSlug || !record.caseStudyName) {
      throw new RetrofitCanadaApiError(`Unexpected response from ${url}`);
    }
    return record;
  });
}
