import "server-only"; // build error if a Client Component imports this file

import { mapCaseStudy, rowToListItem } from "@/lib/retrofit-canada/mapper";
import type { RcCaseStudy } from "@/lib/retrofit-canada/types";
import { getSupabaseReader } from "@/lib/server/supabase";
import type {
  CaseStudyFilterGroup,
  CaseStudyFilterKey,
  CaseStudyListItem,
  CaseStudyRow,
  UnifiedCaseStudy,
} from "@/lib/case-study-types";

export type {
  CaseStudyFilterGroup,
  CaseStudyFilterKey,
  CaseStudyListItem,
  CaseStudyRow,
  ExtractedCaseStudyMetrics,
  ScrapedBeforeAfterGroup,
  ScrapedCaseStudyDetails,
  ScrapedDocument,
  ScrapedMediaItem,
  ScrapedNarrativeSection,
  ScrapedPhotoPhase,
  ScrapedTeamMember,
  ScrapedUpgradeGroup,
  UnifiedCaseStudy,
} from "@/lib/case-study-types";

/**
 * Case studies come from the Supabase table public.case_studies, which the monthly sync fills from
 * Retrofit Canada's API (lib/retrofit-canada/sync.ts). Reads are cached by Next.js for a day and
 * refreshed right after each sync.
 *
 * If Supabase isn't configured (no SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY), these return nothing
 * so the site still starts. If Supabase is configured but the query fails, they throw: a page that
 * was already built then keeps showing its last good version instead of an empty one.
 */

/** Old links from the first version of the site -> the real Retrofit Canada slug. */
const SLUG_ALIASES: Record<string, string> = {
  "north-glenora-net-zero": "north-glenora-net-zero-retrofit",
  "windhaven-airdrie-nze": "windhaven-no-demo-nze-retrofit-1673630936",
  "woodbine-calgary-net-zero": "woodbine",
  "north-van-net-zero": "n-vancouver-net-zero",
  "sundance-housing-coop": "sundance",
  "southeastern-ontario-phased": "se-ontario-phased-retrofit",
};

/** Columns needed for cards, filters and matching (everything except the big raw record). */
const ROW_COLUMNS =
  "id,slug,name,intro,image_url,publish_date,province,city,house_type,year_built,foundation_type," +
  "structure_type,climate_zone,retrofit_type,retrofit_phasing,performance_level,team,before_gj,after_gj," +
  "energy_savings_pct,lessons_learned";

let warnedMissingConfig = false;
function warnMissingConfig() {
  if (warnedMissingConfig) return;
  warnedMissingConfig = true;
  console.warn(
    "[case-studies] SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY are not set, so no case studies are shown. See README → Case studies."
  );
}

/** Every published case study, without the full record. Sorted by name. */
export async function getCaseStudyRows(): Promise<CaseStudyRow[]> {
  const db = getSupabaseReader();
  if (!db) {
    warnMissingConfig();
    return [];
  }
  const { data, error } = await db
    .from("case_studies")
    .select(ROW_COLUMNS)
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw new Error(`Loading case studies from Supabase failed: ${error.message}`);
  return (data ?? []) as unknown as CaseStudyRow[];
}

/** Cards for /case-studies. */
export async function getCaseStudyListItems(): Promise<CaseStudyListItem[]> {
  return (await getCaseStudyRows()).map(rowToListItem);
}

const FILTER_TITLES: Record<CaseStudyFilterKey, string> = {
  locationprovince: "Province or Territory",
  housetype: "Type of Building",
  structuretype: "Building Structure",
  climatezone: "Climate Zone",
  retrofitphasing: "Staged Retrofit",
  retrofittype: "Retrofit Type",
  performancelevel: "Performance Level",
};

/** Filter checkboxes built from the values the case studies actually use ("Other" listed last). */
export function buildFilterGroups(items: CaseStudyListItem[]): Record<CaseStudyFilterKey, CaseStudyFilterGroup> {
  const groups = {} as Record<CaseStudyFilterKey, CaseStudyFilterGroup>;
  for (const key of Object.keys(FILTER_TITLES) as CaseStudyFilterKey[]) {
    const values = Array.from(new Set(items.map((item) => item.filters[key]).filter(Boolean)));
    values.sort((a, b) => (a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b, "en", { numeric: true })));
    groups[key] = { title: FILTER_TITLES[key], options: values.map((value) => ({ value, label: value })) };
  }
  return groups;
}

/** Slugs for generateStaticParams (old alias links are resolved on request). */
export async function getAllCaseStudySlugs(): Promise<string[]> {
  return (await getCaseStudyRows()).map((row) => row.slug);
}

/** One case study with everything the detail page shows, or undefined if it doesn't exist. */
export async function getUnifiedCaseStudyBySlug(slug: string): Promise<UnifiedCaseStudy | undefined> {
  const db = getSupabaseReader();
  if (!db) {
    warnMissingConfig();
    return undefined;
  }
  const wanted = SLUG_ALIASES[slug] ?? slug;
  const { data, error } = await db
    .from("case_studies")
    .select("raw")
    .eq("is_active", true)
    .ilike("slug", wanted.replace(/[%_\\]/g, "\\$&"))
    .limit(1);
  if (error) throw new Error(`Loading case study "${wanted}" from Supabase failed: ${error.message}`);
  const raw = data?.[0]?.raw as RcCaseStudy | undefined;
  return raw ? mapCaseStudy(raw) : undefined;
}
