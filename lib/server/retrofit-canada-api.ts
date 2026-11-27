import {
  getAllUnifiedCaseStudies,
  type RawPortalCaseStudy,
} from "@/lib/case-studies";
import type {
  MatchedCaseStudySummary,
  MockCaseStudyRecord,
  QuestionnaireAnswers,
} from "@/types";

interface CacheState {
  records: MockCaseStudyRecord[];
  lastSyncedAt: string;
  expiresAt: number;
  upstreamPings: number;
  etag?: string;
  pendingSync: Promise<CacheState> | null;
}

const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache cooldown

const globalForCache = globalThis as typeof globalThis & {
  __rcMockApiCache?: CacheState;
};

function getCacheTtlMs(): number {
  const raw = process.env.RETROFIT_CANADA_CACHE_TTL_MS;
  if (!raw) return DEFAULT_CACHE_TTL_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 1000 ? parsed : DEFAULT_CACHE_TTL_MS;
}

export function inferProvinceFromPostalCode(postalCode?: string): string {
  const clean = (postalCode ?? "").trim().toUpperCase();
  if (!clean) return "AB";

  const firstChar = clean[0];
  switch (firstChar) {
    case "T":
      return "AB";
    case "V":
      return "BC";
    case "K":
    case "L":
    case "M":
    case "N":
    case "P":
      return "ON";
    case "G":
    case "H":
    case "J":
      return "QC";
    case "B":
      return "NS";
    case "S":
      return "SK";
    case "R":
      return "MB";
    case "E":
      return "NB";
    case "C":
      return "PE";
    case "A":
      return "NL";
    case "Y":
      return "YT";
    case "X":
      return "NT";
    default:
      return "AB";
  }
}

function normalizePortalRecords(): MockCaseStudyRecord[] {
  return getAllUnifiedCaseStudies().map((item) => {
    const details = item.fullDetails;
    const metrics = item.metrics;
    const hasMetrics =
      metrics.beforeGj !== undefined ||
      metrics.afterGj !== undefined ||
      metrics.energyReductionPercent !== undefined;

    const lessonsSection = details?.sections.find((s) =>
      s.heading.toLowerCase().includes("lesson")
    );

    return {
      id: `rc-${item.id}`,
      externalId: item.id,
      title: item.title,
      slug: item.slug,
      link: item.internalLink,
      imageUrl: item.imageUrl,
      created: item.created,
      yearBuilt: item.yearBuilt,
      province: item.province,
      city: metrics.location,
      houseType: item.houseType,
      structureType: item.structureType,
      climateZone: item.climateZone,
      retrofitPhasing: item.retrofitPhasing,
      retrofitType: item.retrofitType,
      performanceLevel: item.performanceLevel,
      team: item.teamMembers.join("|"),
      beforeGj: metrics.beforeGj,
      afterGj: metrics.afterGj,
      energyReductionPercent: metrics.energyReductionPercent,
      summary: details?.intro || undefined,
      lessonsLearned: lessonsSection
        ? [...lessonsSection.paragraphs, ...lessonsSection.bullets]
        : undefined,
      hasDetailedMetrics: hasMetrics,
      source: "retrofit_canada_mock_api",
    };
  });
}

/**
 * Fetches case studies from the configured external Retrofit Canada API if enabled,
 * or falls back to the local mock Retrofit Canada dataset.
 * Uses a single-flight cache + TTL cooldown to strictly limit upstream API pings.
 */
export async function getCachedCaseStudies(options?: {
  forceRefresh?: boolean;
}): Promise<{
  records: MockCaseStudyRecord[];
  cached: boolean;
  lastSyncedAt: string;
  upstreamPings: number;
}> {
  const now = Date.now();
  const existing = globalForCache.__rcMockApiCache;

  if (
    existing &&
    !options?.forceRefresh &&
    now < existing.expiresAt &&
    existing.records.length > 0
  ) {
    return {
      records: existing.records,
      cached: true,
      lastSyncedAt: existing.lastSyncedAt,
      upstreamPings: existing.upstreamPings,
    };
  }

  // Single-flight lock so concurrent calls do not double-ping upstream
  if (existing?.pendingSync) {
    const settled = await existing.pendingSync;
    return {
      records: settled.records,
      cached: true,
      lastSyncedAt: settled.lastSyncedAt,
      upstreamPings: settled.upstreamPings,
    };
  }

  const syncPromise = (async (): Promise<CacheState> => {
    const previousPings = existing?.upstreamPings ?? 0;
    const ttl = getCacheTtlMs();
    const apiUrl = process.env.RETROFIT_CANADA_API_URL?.trim();
    const apiKey = process.env.RETROFIT_CANADA_API_KEY?.trim();

    let records: MockCaseStudyRecord[] | null = null;
    let etag = existing?.etag;

    // Optional live upstream hook when Retrofit Canada provides credentials later
    if (apiUrl && apiKey) {
      try {
        const headers: Record<string, string> = {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        };
        if (etag) {
          headers["If-None-Match"] = etag;
        }

        const res = await fetch(apiUrl, {
          headers,
          signal: AbortSignal.timeout(8000),
          cache: "no-store",
        });

        if (res.status === 304 && existing?.records.length) {
          records = existing.records;
        } else if (res.ok) {
          const payload = (await res.json()) as RawPortalCaseStudy[];
          if (Array.isArray(payload) && payload.length > 0) {
            etag = res.headers.get("etag") ?? etag;
            records = payload.map((item) => ({
              id: `api-${item.id}`,
              externalId: item.id,
              title: item.title ?? "Untitled Case Study",
              slug: item.link?.replace(/^\/case-studies\//, "") || `rc-${item.id}`,
              link: item.link || "#",
              imageUrl: item.image ?? "",
              created: item.created ?? "",
              yearBuilt: typeof item.yearBuilt === "number" ? item.yearBuilt : null,
              province: item.province?.toUpperCase() || "AB",
              houseType: item.houseType || "Single-Family 2+ Stories",
              structureType: item.structureType || "Wood-Framed",
              climateZone: item.climateZone || "",
              retrofitPhasing: item.retrofitPhasing || "No",
              retrofitType: item.retrofitType || "Envelope and Mechanical",
              performanceLevel: item.performanceLevel || "Other",
              team: item.team || "",
              hasDetailedMetrics: false,
              source: "retrofit_canada_mock_api",
            }));
          }
        }
      } catch {
        // Fall back safely to cached or mock records if upstream is unreachable
        records = existing?.records.length ? existing.records : null;
      }
    }

    if (!records) {
      records = normalizePortalRecords();
    }

    const nextState: CacheState = {
      records,
      lastSyncedAt: new Date().toISOString(),
      expiresAt: Date.now() + ttl,
      upstreamPings: previousPings + 1,
      etag,
      pendingSync: null,
    };

    globalForCache.__rcMockApiCache = nextState;
    return nextState;
  })();

  if (existing) {
    existing.pendingSync = syncPromise;
  } else {
    globalForCache.__rcMockApiCache = {
      records: [],
      lastSyncedAt: new Date().toISOString(),
      expiresAt: 0,
      upstreamPings: 0,
      pendingSync: syncPromise,
    };
  }

  const finalState = await syncPromise;
  return {
    records: finalState.records,
    cached: false,
    lastSyncedAt: finalState.lastSyncedAt,
    upstreamPings: finalState.upstreamPings,
  };
}

function estimateTargetYear(answers: QuestionnaireAnswers): number | null {
  if (
    answers.yearBuilt === "Enter exact year" &&
    typeof answers.exactYear === "string"
  ) {
    const parsed = Number.parseInt(answers.exactYear, 10);
    if (Number.isFinite(parsed)) return parsed;
  }

  switch (answers.yearBuilt) {
    case "Pre-1950":
      return 1940;
    case "1950–1969":
      return 1960;
    case "1970–1989":
      return 1980;
    case "1990–2005":
      return 1998;
    case "2006–Present":
      return 2014;
    default:
      return null;
  }
}

function matchesHouseType(
  recordHouseType: string,
  homeType?: string,
  storeys?: string
): boolean {
  const hay = recordHouseType.toLowerCase();
  const home = (homeType ?? "").toLowerCase();
  const storey = (storeys ?? "").toLowerCase();

  if (storey.includes("bungalow") && hay.includes("bungalow")) return true;
  if (storey.includes("split") && hay.includes("split")) return true;
  if (home.includes("duplex") && hay.includes("duplex")) return true;
  if (home.includes("townhome") && (hay.includes("town") || hay.includes("row"))) {
    return true;
  }
  if (home.includes("mobile") && hay.includes("manufactured")) return true;
  if (home.includes("detached") && hay.includes("single-family")) return true;
  return false;
}

export async function findMatchingCaseStudies(
  answers: QuestionnaireAnswers,
  limit = 4
): Promise<{
  matches: MatchedCaseStudySummary[];
  cacheMeta: {
    provider: "mock_retrofit_canada_api";
    cached: boolean;
    lastSyncedAt: string;
    upstreamPings: number;
    totalRecordsAvailable: number;
  };
}> {
  const { records, cached, lastSyncedAt, upstreamPings } =
    await getCachedCaseStudies();

  const targetProvince = inferProvinceFromPostalCode(
    typeof answers.postalCode === "string" ? answers.postalCode : undefined
  );
  const targetYear = estimateTargetYear(answers);
  const homeType = typeof answers.homeType === "string" ? answers.homeType : "";
  const storeys = typeof answers.storeys === "string" ? answers.storeys : "";

  const scored = records.map((record) => {
    let score = 0;
    const reasons: string[] = [];

    if (record.province === targetProvince) {
      score += 40;
      reasons.push(`Same province (${targetProvince})`);
    }

    if (record.hasDetailedMetrics) {
      score += 20;
      reasons.push("Includes energy & financial metrics");
    }

    if (matchesHouseType(record.houseType, homeType, storeys)) {
      score += 22;
      reasons.push(`Similar home style (${record.houseType})`);
    }

    if (targetYear !== null && record.yearBuilt !== null) {
      const diff = Math.abs(targetYear - record.yearBuilt);
      if (diff <= 15) {
        score += 18;
        reasons.push(`Similar build era (${record.yearBuilt})`);
      } else if (diff <= 30) {
        score += 9;
        reasons.push(`Comparable vintage (${record.yearBuilt})`);
      }
    }

    return { record, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);

  const matches: MatchedCaseStudySummary[] = scored
    .slice(0, limit)
    .map(({ record, score, reasons }) => ({
      id: record.id,
      title: record.title,
      province: record.province,
      city: record.city,
      houseType: record.houseType,
      yearBuilt: record.yearBuilt,
      retrofitType: record.retrofitType,
      performanceLevel: record.performanceLevel,
      link: record.link,
      imageUrl: record.imageUrl,
      beforeGj: record.beforeGj,
      afterGj: record.afterGj,
      energyReductionPercent: record.energyReductionPercent,
      netCost: record.netCost,
      annualUtilitySavings: record.annualUtilitySavings,
      summary: record.summary,
      matchScore: score,
      matchReasons:
        reasons.length > 0 ? reasons : ["Canadian deep retrofit reference"],
      hasDetailedMetrics: record.hasDetailedMetrics,
      source: record.source,
    }));

  return {
    matches,
    cacheMeta: {
      provider: "mock_retrofit_canada_api",
      cached,
      lastSyncedAt,
      upstreamPings,
      totalRecordsAvailable: records.length,
    },
  };
}
