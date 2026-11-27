import "server-only";

import { getSupabaseRebatesReader } from "@/lib/server/supabase";
import type { RebateProgramMatch } from "@/types";

interface RebateRow {
  slug: string;
  name: string;
  level: "Federal" | "Provincial" | "Municipal" | "Utility";
  province: string;
  summary: string;
  estimated_value: string;
  eligibility_notes: string;
  url: string;
  status: "active" | "waitlist" | "closed";
  last_verified_at: string;
}

interface RebateCacheState {
  rows: RebateRow[];
  expiresAt: number;
}

const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000;
const globalForRebates = globalThis as typeof globalThis & {
  __rcRebatesCache?: RebateCacheState;
};

export function resetRebatesCacheForTests(): void {
  delete globalForRebates.__rcRebatesCache;
}

export function getFallbackRebates(
  province: string,
  financingAnswer?: string
): RebateProgramMatch[] {
  const rebates: RebateProgramMatch[] = [
    {
      id: "cghl",
      name: "Canada Greener Homes Loan",
      level: "Federal",
      summary:
        "Interest-free financing of $5,000 to $40,000 over 10 years for eligible deep energy retrofits.",
      estimatedValue: "Up to $40,000 (0% APR loan)",
      eligibilityNotes:
        "Requires a pre- and post-retrofit EnerGuide home energy evaluation.",
      url: "https://natural-resources.canada.ca/energy-efficiency/homes/canada-greener-homes-initiative/24831",
      status: "active",
      source: "fallback",
    },
  ];

  if (province === "AB") {
    rebates.push({
      id: "ab-ceip",
      name: "Clean Energy Improvement Program (CEIP Alberta)",
      level: "Municipal",
      summary:
        "Low-interest financing repaid through your municipal property tax bill for eligible envelope, heat pump, and solar upgrades.",
      estimatedValue: "Up to 100% project financing (municipality dependent)",
      eligibilityNotes:
        "Available in participating Alberta municipalities including Calgary and Edmonton.",
      url: "https://ceip.abmunis.ca/",
      status: "active",
      source: "fallback",
    });
  } else if (province === "BC") {
    rebates.push({
      id: "bc-cleanbc",
      name: "CleanBC Better Homes & Home Renovation Rebate",
      level: "Provincial",
      summary:
        "Rebates for switching from fossil-fuel heating to cold-climate heat pumps, insulation, and window upgrades.",
      estimatedValue: "$1,000 – $6,000+ (measure dependent)",
      eligibilityNotes: "Income-qualified top-ups may increase rebate amounts.",
      url: "https://www.betterhomesbc.ca/",
      status: "active",
      source: "fallback",
    });
  } else if (province === "ON") {
    rebates.push({
      id: "on-hrs",
      name: "Ontario Home Renovation Savings Program",
      level: "Provincial",
      summary:
        "Rebates for heat pumps, insulation, air sealing, windows/doors, and rooftop solar with battery storage.",
      estimatedValue: "$600 – $7,500+ (measure dependent)",
      eligibilityNotes:
        "Available for eligible electrically or gas-heated homes in Ontario.",
      url: "https://www.homerenovationsavings.ca/",
      status: "active",
      source: "fallback",
    });
  } else {
    rebates.push({
      id: "prov-efficiency",
      name: `${province} Provincial / Utility Efficiency Rebates`,
      level: "Provincial",
      summary:
        "Regional utility and provincial incentives for air sealing, attic insulation, and high-efficiency heat pumps.",
      estimatedValue: "$500 – $5,000 (program dependent)",
      eligibilityNotes:
        "Confirm current program intake windows with your local energy utility or Energy Advisor.",
      url: "https://retrofitcanada.com/the-retrofit-roadmap",
      status: "active",
      source: "fallback",
    });
  }

  if (
    financingAnswer === "Yes, I'm interested" ||
    financingAnswer === "Maybe / Tell me more"
  ) {
    rebates.push({
      id: "ohpa",
      name: "Oil to Heat Pump Affordability (OHPA) Program",
      level: "Federal",
      summary:
        "Upfront grants for eligible low-to-median income households switching away from oil heating.",
      estimatedValue: "Up to $10,000 – $15,000 (if oil-heated & eligible)",
      eligibilityNotes:
        "Applies specifically to homes currently heated primarily with oil.",
      url: "https://natural-resources.canada.ca/energy-efficiency/homes/canada-greener-homes-initiative/oil-heat-pump-affordability-program/24775",
      status: "active",
      source: "fallback",
    });
  }

  return rebates;
}

async function loadActiveRebateRows(): Promise<RebateRow[]> {
  const now = Date.now();
  const cached = globalForRebates.__rcRebatesCache;
  if (cached && now < cached.expiresAt && cached.rows.length > 0) {
    return cached.rows;
  }

  const db = getSupabaseRebatesReader();
  if (!db) return [];

  try {
    const { data, error } = await db
      .from("rebate_programs")
      .select(
        "slug,name,level,province,summary,estimated_value,eligibility_notes,url,status,last_verified_at"
      )
      .eq("is_active", true)
      .order("level", { ascending: true });

    if (error) {
      console.warn("[rebates] Supabase read failed; using fallback:", error.message);
      return cached?.rows ?? [];
    }

    const rows = (data ?? []) as unknown as RebateRow[];
    if (rows.length > 0) {
      globalForRebates.__rcRebatesCache = {
        rows,
        expiresAt: now + DEFAULT_CACHE_TTL_MS,
      };
    }
    return rows;
  } catch (err) {
    console.warn("[rebates] Supabase read threw; using fallback:", err);
    return cached?.rows ?? [];
  }
}

/**
 * Returns active federal + provincial/municipal rebates for a province from Supabase
 * (cached in memory for 1 hour), falling back to built-in defaults if unconfigured/empty.
 */
export async function getMatchingRebatesAsync(
  province: string,
  financingAnswer?: string
): Promise<RebateProgramMatch[]> {
  const rows = await loadActiveRebateRows();
  const targetProv = province.trim().toUpperCase();

  const matching = rows.filter(
    (row) => row.province === "ALL" || row.province === targetProv
  );

  if (matching.length === 0) {
    return getFallbackRebates(targetProv, financingAnswer);
  }

  return matching.map((row) => ({
    id: row.slug,
    name: row.name,
    level: row.level,
    summary: row.summary,
    estimatedValue: row.estimated_value,
    eligibilityNotes: row.eligibility_notes,
    url: row.url,
    status: row.status,
    lastVerifiedAt: row.last_verified_at,
    source: "supabase",
  }));
}
