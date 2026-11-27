import allCaseStudiesRaw from "@/data/all_case_studies.json";
import caseStudiesFullRaw from "@/data/case_studies_full.json";

export interface RawPortalCaseStudy {
  id: number;
  title: string;
  name?: string;
  link: string;
  image?: string;
  created?: string;
  yearBuilt?: number;
  province?: string;
  houseType?: string;
  structureType?: string;
  climateZone?: string;
  retrofitPhasing?: string;
  retrofitType?: string;
  performanceLevel?: string;
  team?: string;
}

export interface ScrapedTeamMember {
  name: string;
  role?: string;
  url?: string;
}

export interface ScrapedUpgradeGroup {
  category: string;
  items: string[];
}

export interface ScrapedNarrativeSection {
  heading: string;
  paragraphs: string[];
  bullets: string[];
}

export interface ScrapedBeforeAfterGroup {
  section: string;
  rows: { label: string; before: string; after: string }[];
}

export interface ScrapedDocument {
  title: string;
  url: string;
}

export interface ScrapedMediaItem {
  url: string;
  caption: string;
}

export interface ScrapedPhotoPhase {
  phase: string;
  items: ScrapedMediaItem[];
}

export interface ScrapedCaseStudyDetails {
  id: number;
  slug: string;
  sourceUrl: string;
  intro: string;
  projectInfo: { label: string; value: string }[];
  team: ScrapedTeamMember[];
  priorities: string[];
  upgrades: ScrapedUpgradeGroup[];
  sections: ScrapedNarrativeSection[];
  beforeAndAfter: ScrapedBeforeAfterGroup[];
  documents: ScrapedDocument[];
  videos: { url: string }[];
  drawings: ScrapedMediaItem[];
  photos: ScrapedPhotoPhase[];
}

export interface ExtractedCaseStudyMetrics {
  location?: string;
  floorArea?: string;
  yearCompleted?: string;
  beforeGj?: number;
  afterGj?: number;
  energyReductionPercent?: number;
  annualEnergySavingsText?: string;
  operationalCarbonSavingsText?: string;
  airtightnessBefore?: string;
  airtightnessAfter?: string;
}

export interface UnifiedCaseStudy {
  id: number;
  slug: string;
  title: string;
  internalLink: string;
  externalUrl: string;
  imageUrl: string;
  created: string;
  yearBuilt: number | null;
  province: string;
  houseType: string;
  structureType: string;
  climateZone: string;
  retrofitPhasing: string;
  retrofitType: string;
  performanceLevel: string;
  teamMembers: string[];
  fullDetails?: ScrapedCaseStudyDetails;
  metrics: ExtractedCaseStudyMetrics;
}

const SLUG_ALIASES: Record<string, string> = {
  "north-glenora-net-zero": "north-glenora-net-zero-retrofit",
  "windhaven-airdrie-nze": "windhaven-no-demo-nze-retrofit-1673630936",
  "woodbine-calgary-net-zero": "woodbine",
  "north-van-net-zero": "n-vancouver-net-zero",
  "sundance-housing-coop": "sundance",
  "southeastern-ontario-phased": "se-ontario-phased-retrofit",
};

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#038;|&amp;/g, "&")
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#039;/g, "'")
    .trim();
}

function inferHouseTypeFromTitle(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("bungalow")) return "Single-Family Bungalow (incl. 1.5 Story)";
  if (lower.includes("split")) return "Single-Family Split-Level";
  if (lower.includes("bi-level")) return "Single-Family Bi-Level";
  if (lower.includes("town") || lower.includes("row")) return "Row/Townhouse";
  if (lower.includes("duplex") || lower.includes("semi")) return "Duplex or Semi-Detached";
  return "Single-Family / Other";
}

function parseFirstNumber(text?: string): number | undefined {
  if (!text) return undefined;
  const cleaned = text.replace(/,/g, "");
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return undefined;
  const val = Number.parseFloat(match[0]);
  return Number.isFinite(val) ? val : undefined;
}

function extractMetrics(
  details?: ScrapedCaseStudyDetails
): ExtractedCaseStudyMetrics {
  if (!details) return {};

  const infoMap = new Map<string, string>();
  for (const entry of details.projectInfo) {
    infoMap.set(entry.label.toLowerCase(), entry.value);
  }

  let beforeGj: number | undefined;
  let afterGj: number | undefined;
  let airtightnessBefore: string | undefined;
  let airtightnessAfter: string | undefined;

  for (const group of details.beforeAndAfter) {
    for (const row of group.rows) {
      const label = row.label.toLowerCase();
      if (label === "total annual consumption") {
        beforeGj = parseFirstNumber(row.before);
        afterGj = parseFirstNumber(row.after);
      } else if (label === "air tightness") {
        if (row.before && row.before !== "N/A") airtightnessBefore = row.before;
        if (row.after && row.after !== "N/A") airtightnessAfter = row.after;
      }
    }
  }

  const annualSavingsText = infoMap.get("annual energy savings");
  let energyReductionPercent = parseFirstNumber(annualSavingsText);
  if (
    energyReductionPercent === undefined &&
    beforeGj !== undefined &&
    afterGj !== undefined &&
    beforeGj > 0
  ) {
    energyReductionPercent = Number(
      (((beforeGj - afterGj) / beforeGj) * 100).toFixed(1)
    );
  }

  return {
    location: infoMap.get("location"),
    floorArea: infoMap.get("post-retrofit total floor area"),
    yearCompleted: infoMap.get("year completed"),
    beforeGj,
    afterGj,
    energyReductionPercent,
    annualEnergySavingsText: annualSavingsText,
    operationalCarbonSavingsText: infoMap.get("operational carbon savings"),
    airtightnessBefore,
    airtightnessAfter,
  };
}

const fullDetailsBySlug = caseStudiesFullRaw as Record<
  string,
  ScrapedCaseStudyDetails
>;

const UNIFIED_CASE_STUDIES: UnifiedCaseStudy[] = (
  allCaseStudiesRaw as RawPortalCaseStudy[]
)
  .filter((item) => Boolean(item.title && item.link))
  .map((item) => {
    const slug = item.link.replace(/^\/case-studies\//, "").trim();
    const fullDetails = fullDetailsBySlug[slug];
    const metrics = extractMetrics(fullDetails);
    const infoBuildingType = fullDetails?.projectInfo.find(
      (p) => p.label.toLowerCase() === "building type"
    )?.value;

    const teamMembers =
      fullDetails && fullDetails.team.length > 0
        ? fullDetails.team.map((t) =>
            t.role ? `${t.name} (${t.role})` : t.name
          )
        : (item.team ?? "")
            .split("|")
            .map((member) => decodeHtmlEntities(member))
            .filter(Boolean);

    return {
      id: item.id,
      slug,
      title: decodeHtmlEntities(item.title),
      internalLink: `/case-studies/${slug}`,
      externalUrl: item.link.startsWith("http")
        ? item.link
        : `https://retrofitcanada.com${item.link}`,
      imageUrl: item.image?.trim() || "",
      created: item.created?.trim() || "",
      yearBuilt:
        typeof item.yearBuilt === "number" && item.yearBuilt > 1700
          ? item.yearBuilt
          : null,
      province: item.province?.trim().toUpperCase() || "AB",
      houseType:
        item.houseType?.trim() ||
        infoBuildingType ||
        inferHouseTypeFromTitle(item.title),
      structureType: item.structureType?.trim() || "Not specified",
      climateZone: item.climateZone?.trim() || "Not specified",
      retrofitPhasing: item.retrofitPhasing?.trim() || "Not specified",
      retrofitType: item.retrofitType?.trim() || "Deep Energy Retrofit",
      performanceLevel: item.performanceLevel?.trim() || "Case Study",
      teamMembers,
      fullDetails,
      metrics,
    };
  });

export function getAllUnifiedCaseStudies(): UnifiedCaseStudy[] {
  return UNIFIED_CASE_STUDIES;
}

export function getAllCaseStudySlugs(): string[] {
  const unique = new Set<string>();
  for (const cs of UNIFIED_CASE_STUDIES) {
    unique.add(cs.slug);
  }
  for (const alias of Object.keys(SLUG_ALIASES)) {
    unique.add(alias);
  }
  return Array.from(unique);
}

export function getUnifiedCaseStudyBySlug(
  slug: string
): UnifiedCaseStudy | undefined {
  const normalized = SLUG_ALIASES[slug] ?? slug;
  return UNIFIED_CASE_STUDIES.find(
    (cs) => cs.slug.toLowerCase() === normalized.toLowerCase()
  );
}
