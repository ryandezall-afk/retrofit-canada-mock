import { getCaseStudyRows } from "@/lib/case-studies";
import type { CaseStudyRow } from "@/lib/case-study-types";
import type {
  MatchedCaseStudySummary,
  MockCaseStudyRecord,
  QuestionnaireAnswers,
} from "@/types";

/**
 * Case studies for the advisor. They come from Supabase (filled monthly from Retrofit Canada's
 * API by lib/retrofit-canada/sync.ts) and are kept in this server's memory for an hour, so a
 * busy hour costs one database read.
 */

interface CacheState {
  records: MockCaseStudyRecord[];
  lastSyncedAt: string;
  expiresAt: number;
  upstreamPings: number;
  pendingSync: Promise<CacheState> | null;
}

const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const globalForCache = globalThis as typeof globalThis & {
  __rcCaseStudyCache?: CacheState;
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

function toRecord(row: CaseStudyRow): MockCaseStudyRecord {
  const hasMetrics = row.before_gj !== null || row.after_gj !== null || row.energy_savings_pct !== null;
  return {
    id: `rc-${row.id}`,
    externalId: row.id,
    title: row.name,
    slug: row.slug,
    link: `/case-studies/${row.slug}`,
    imageUrl: row.image_url ?? "",
    created: row.publish_date ?? "",
    yearBuilt: row.year_built,
    province: row.province ?? "",
    city: [row.city, row.province].filter(Boolean).join(", ") || undefined,
    houseType: row.house_type ?? "Not specified",
    structureType: row.structure_type ?? "Not specified",
    climateZone: row.climate_zone ?? "Not specified",
    retrofitPhasing: row.retrofit_phasing ?? "Not specified",
    retrofitType: row.retrofit_type ?? "Not specified",
    performanceLevel: row.performance_level ?? "Not specified",
    team: (row.team ?? []).map((m) => (m.role ? `${m.name} (${m.role})` : m.name)).join("|"),
    beforeGj: row.before_gj ?? undefined,
    afterGj: row.after_gj ?? undefined,
    energyReductionPercent: row.energy_savings_pct ?? undefined,
    summary: row.intro ?? undefined,
    lessonsLearned: row.lessons_learned ? row.lessons_learned.split("\n").filter(Boolean) : undefined,
    hasDetailedMetrics: hasMetrics,
    source: "retrofit_canada_api",
  };
}

/**
 * Returns the published case studies, from memory when loaded in the last hour.
 * If Supabase can't be reached, keeps serving the last list it loaded (or an empty list).
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
  const existing = globalForCache.__rcCaseStudyCache;

  if (existing && !options?.forceRefresh && now < existing.expiresAt && existing.records.length > 0) {
    return {
      records: existing.records,
      cached: true,
      lastSyncedAt: existing.lastSyncedAt,
      upstreamPings: existing.upstreamPings,
    };
  }

  // Single-flight: concurrent requests share one database read.
  if (existing?.pendingSync) {
    const settled = await existing.pendingSync;
    return {
      records: settled.records,
      cached: true,
      lastSyncedAt: settled.lastSyncedAt,
      upstreamPings: settled.upstreamPings,
    };
  }

  const loadPromise = (async (): Promise<CacheState> => {
    const previousLoads = existing?.upstreamPings ?? 0;
    let records: MockCaseStudyRecord[];
    let ttl = getCacheTtlMs();
    try {
      records = (await getCaseStudyRows()).map(toRecord);
    } catch (err) {
      console.error("[case-studies] Supabase read failed; using the last loaded list.", err);
      records = existing?.records ?? [];
      ttl = 60 * 1000; // try again in a minute
    }
    const nextState: CacheState = {
      records,
      lastSyncedAt: new Date().toISOString(),
      expiresAt: Date.now() + ttl,
      upstreamPings: previousLoads + 1,
      pendingSync: null,
    };
    globalForCache.__rcCaseStudyCache = nextState;
    return nextState;
  })();

  if (existing) {
    existing.pendingSync = loadPromise;
  } else {
    globalForCache.__rcCaseStudyCache = {
      records: [],
      lastSyncedAt: new Date().toISOString(),
      expiresAt: 0,
      upstreamPings: 0,
      pendingSync: loadPromise,
    };
  }

  const finalState = await loadPromise;
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

const PROVINCE_NAMES: Record<string, string> = {
  ALBERTA: "AB",
  "BRITISH COLUMBIA": "BC",
  ONTARIO: "ON",
  QUEBEC: "QC",
  "QUÉBEC": "QC",
  "NOVA SCOTIA": "NS",
  SASKATCHEWAN: "SK",
  MANITOBA: "MB",
  "NEW BRUNSWICK": "NB",
  "PRINCE EDWARD ISLAND": "PE",
  "NEWFOUNDLAND AND LABRADOR": "NL",
  YUKON: "YT",
  "NORTHWEST TERRITORIES": "NT",
  NUNAVUT: "NU",
};

/** "SASKATCHEWAN" -> "SK"; two-letter codes pass through. */
function normalizeProvince(value: string): string {
  const upper = value.trim().toUpperCase();
  return PROVINCE_NAMES[upper] ?? upper;
}

function isNonResidential(houseType: string): boolean {
  const t = houseType.toLowerCase();
  return (
    t.includes("part 3") ||
    t.includes("office") ||
    t.includes("utility") ||
    t.includes("commercial")
  );
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
    provider: "retrofit_canada_supabase";
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

  // The library also holds offices, utilities and large "Part 3" buildings; never offer
  // those as comparables for a house, unless nothing else is available.
  const residential = records.filter((r) => !isNonResidential(r.houseType));
  const pool = residential.length > 0 ? residential : records;

  const scored = pool.map((record) => {
    let score = 0;
    const reasons: string[] = [];

    if (normalizeProvince(record.province) === targetProvince) {
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
      slug: record.slug,
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
      provider: "retrofit_canada_supabase",
      cached,
      lastSyncedAt,
      upstreamPings,
      totalRecordsAvailable: records.length,
    },
  };
}
