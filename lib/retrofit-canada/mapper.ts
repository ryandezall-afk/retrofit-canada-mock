/**
 * Turns a Retrofit Canada API record into what our pages and the advisor use.
 *
 *   API record (raw)  --mapCaseStudy-->  UnifiedCaseStudy (detail page, advisor)
 *                     --toCaseStudyRow-->  row for the Supabase table case_studies
 *   Supabase row      --rowToListItem-->  CaseStudyListItem (list page cards + filters)
 *
 * Labels, row order and number formats copy retrofitcanada.com, so our detail page shows the
 * same thing the official page shows. Field names come from GET /api/v1/properties.
 */
import type {
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
import {
  CLIMATE_ZONES,
  HOUSE_TYPES,
  PERFORMANCE_LEVELS,
  PROVINCES,
  RETROFIT_PHASING,
  RETROFIT_TYPES,
  STRUCTURE_TYPES,
} from "./options";
import type { RcCaseStudy, RcFile } from "./types";

export const PORTAL_ORIGIN = "https://portal.retrofitcanada.com";
export const WEBSITE_ORIGIN = "https://retrofitcanada.com";

// ---------------------------------------------------------------------------------------------
// Reading values. The API sends "" for empty fields, numbers as numbers or numeric strings,
// and multi-select answers as one comma-separated string.
// ---------------------------------------------------------------------------------------------

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "string") return value.trim();
  return "";
}

function num(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** "A,B , C" -> ["A", "B", "C"]. No option in the data dictionary contains a comma. */
function multi(value: unknown): string[] {
  return text(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function files(value: unknown): RcFile[] {
  return Array.isArray(value)
    ? value.filter((f): f is RcFile => Boolean(f) && typeof f === "object" && "id" in f)
    : [];
}

function absoluteUrl(path: string): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${PORTAL_ORIGIN}/${path.replace(/^\/+/, "")}`;
}

/**
 * Number formats used on retrofitcanada.com:
 *   decimals given -> "7,899.00" (thousands separator, fixed decimals), but 0 shows as "0"
 *   no decimals    -> the number as stored, e.g. "20.9" or "5120"
 */
function formatNumber(value: number, decimals?: number): string {
  if (decimals === undefined) return String(value);
  if (value === 0) return "0";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

interface ValueFormat {
  /** Treat as a number with this many decimals (see formatNumber). */
  decimals?: number;
  /** Treat as a number, rounded to at most this many decimals: 12.2 -> "12.2", 87.456 -> "87.46". */
  maxDecimals?: number;
  /** Treat as a number but show it as stored. */
  number?: boolean;
  prefix?: string;
  /** Added after the value with a space, e.g. "GJ" -> "225.27 GJ". */
  unit?: string;
  /** Added right after the value, e.g. "%" or "m²". */
  suffix?: string;
}

function formatValue(value: unknown, format: ValueFormat = {}): string {
  const isNumeric = format.decimals !== undefined || format.maxDecimals !== undefined || format.number;
  let shown: string;
  if (isNumeric) {
    const n = num(value);
    if (n === undefined) shown = text(value);
    else if (format.maxDecimals !== undefined) shown = String(Number(n.toFixed(format.maxDecimals)));
    else shown = formatNumber(n, format.decimals);
  } else {
    shown = text(value);
  }
  if (!shown) return "";
  return `${format.prefix ?? ""}${shown}${format.suffix ?? ""}${format.unit ? ` ${format.unit}` : ""}`;
}

// ---------------------------------------------------------------------------------------------
// Project information box (label order as on retrofitcanada.com)
// ---------------------------------------------------------------------------------------------

function projectInfo(raw: RcCaseStudy): { label: string; value: string }[] {
  const location = [text(raw.locationCity), text(raw.locationProvince)].filter(Boolean).join(", ");
  const entries: [string, string][] = [
    ["Building Type", text(raw.houseType)],
    ["Location", location],
    ["Year Built", text(raw.yearBuilt)],
    ["Foundation Type", text(raw.foundationType)],
    ["Structure Type", text(raw.structureType)],
    ["Post-Retrofit Total Floor Area", formatValue(raw.totalFloorArea, { number: true, suffix: "m²" })],
    ["Climate Zone", text(raw.climateZone)],
    ["Heating Degree Days", text(raw.climateHDD)],
    ["Retrofit Status", text(raw.retrofitStatus)],
    ["Year Completed", text(raw.yearRetrofitComplete)],
    ["Retrofit Phasing", text(raw.retrofitPhasing)],
    ["Geometry Changed", text(raw.homeGeometryChange)],
    ["Annual Energy Savings", formatValue(raw.annualEnergySavings, { maxDecimals: 2, suffix: "%" })],
    ["Operational Carbon Savings", formatValue(raw.opCarbonSavings, { maxDecimals: 2, unit: "tCO2eq/y" })],
    ["Retrofit Type", text(raw.retrofitType)],
    ["Performance Level", text(raw.performanceLevel)],
  ];
  return entries.filter(([, value]) => value).map(([label, value]) => ({ label, value }));
}

// ---------------------------------------------------------------------------------------------
// Before & After tables. [label, before field, after field, format]
// ---------------------------------------------------------------------------------------------

type Row = [label: string, before: string, after: string, format?: ValueFormat];

const R_VALUE: ValueFormat = { number: true, prefix: "R-" };
const GJ: ValueFormat = { decimals: 2, unit: "GJ" };
const INTENSITY: ValueFormat = { decimals: 2, unit: "kWh/m2/a" };
const KG_CO2E: ValueFormat = { decimals: 2, unit: "KgCO2e" };

const BEFORE_AFTER: { section: string; rows: Row[] }[] = [
  {
    section: "General",
    rows: [
      ["Building Condition", "preBuildingCondition", "postBuildingCondition"],
      ["Comfort", "preComfort", "postComfort"],
    ],
  },
  {
    section: "Envelope",
    rows: [
      ["Attic/Roof Assembly", "preCeilingIns", "postCeilingIns"],
      ["Attic/Roof Assembly Effective Thermal Resistance", "preAtticRvalue", "postAtticRvalue", R_VALUE],
      ["Wall Assembly", "preWallIns", "postWallIns"],
      ["Wall Assembly Effective Thermal Resistance", "preWallRvalue", "postWallRvalue", R_VALUE],
      ["Foundation Wall Assembly", "preFoundationIns", "postFoundationIns"],
      ["Foundation Wall Assembly Effective Thermal Resistance", "preFoundationRvalue", "postFoundationRvalue", R_VALUE],
      ["Foundation Floor Assembly", "preFoundationFloorAssembly", "postFoundationFloorAssembly"],
      ["Foundation Floor Assembly Effective Thermal Resistance", "preFoundationFloorRValue", "postFoundationFloorRValue", R_VALUE],
      ["Windows and Doors", "preWindows", "postWindows"],
      ["Air Tightness", "preACH", "postACH", { decimals: 2, unit: "ACH50" }],
      ["Envelope – Other", "preOtherEnvelope", "postOtherEnvelope"],
    ],
  },
  {
    section: "Mechanical & Electrical",
    rows: [
      ["Cooling", "preCooling", "postCooling"],
      ["Heating", "preHeating", "postHeating"],
      ["Hot Water", "preHotWater", "postHotWater"],
      ["Ventilation", "preVentilation", "postVentilation"],
      ["Renewables", "preRenewables", "postRenewables"],
      ["Electrical Service", "preAmp", "postAmp", { unit: "Amps" }],
      ["Mechanical Other", "preOtherMechanical", "postOtherMechanical"],
    ],
  },
  {
    section: "Annual Energy Usage",
    rows: [
      ["Total Annual Consumption", "preTotalAnnualConsumptionCalculated", "postTotalAnnualConsumptionCalculated", GJ],
      ["Total Net Consumption", "preTotalNetConsumptionCalculated", "postTotalNetConsumptionCalculated", GJ],
      ["Energy Use Intensity", "preEnergyUseIntensityCalculation", "postEnergyUseIntensityCalculation", INTENSITY],
      ["Annual Heating Demand Intensity", "preAnnualHeatingDemandIntensityCalculation", "postAnnualHeatingDemandIntensityCalculation", INTENSITY],
      ["Annual Cooling Demand Intensity", "preAnnualCoolingDemandIntensityCalculation", "postAnnualCoolingDemandIntensityCalculation", INTENSITY],
      ["Annual Electricity Consumption", "preAnnualElectricityConsumptionCalculation", "postAnnualElectricityConsumptionCalculation", { decimals: 2, unit: "kWh" }],
      ["Annual Natural Gas Consumption", "preAnnualNaturalGasConsumptionCalculation", "postAnnualNaturalGasConsumptionCalculation", GJ],
      ["Light and Appliance Energy Consumption", "preLightAndApplianceEnergyConsumptionCalculated", "postLightAndApplianceEnergyConsumptionCalculated", GJ],
      ["Space Cooling", "preSpaceCoolingCalculated", "postSpaceCoolingCalculated", GJ],
      ["Space Heating", "preSpaceHeatingCalculated", "postSpaceHeatingCalculated", GJ],
      ["Ventilation", "preVentilationCalculated", "postVentilationCalculated", GJ],
      ["Water Heating", "preWaterHeatingCalculated", "postWaterHeatingCalculated", GJ],
      ["Annual Propane Consumption", "preAnnualPropaneConsumptionCalculation", "postAnnualPropaneConsumptionCalculation", { number: true, unit: "L" }],
      ["Annual Oil Consumption", "preAnnualOilConsumptionCalculation", "postAnnualOilConsumptionCalculation", { number: true, unit: "L" }],
      ["Annual Wood Consumption", "preAnnualWoodConsumptionCalculation", "postAnnualWoodConsumptionCalculation", { number: true, unit: "tonne" }],
      ["Attic/Ceiling Heat Loss", "preAtticCeilingHeatingLossCalculated", "postAtticCeilingHeatingLossCalculated", GJ],
      ["Main Walls Heat Loss", "preMainWallsHeatingLossCalculated", "postMainWallsHeatingLossCalculated", GJ],
      ["Exposed Floors Heat Loss", "preExposedFloorsHeatingLossCalculated", "postExposedFloorsHeatingLossCalculated", GJ],
      ["Windows Heat Loss", "preWindowsHeatingLossCalculated", "postWindowsHeatingLossCalculated", GJ],
      ["Exterior Doors Heat Loss", "preExteriorDoorsHeatingLossCalculated", "postExteriorDoorsHeatingLossCalculated", GJ],
      ["Basement Foundation Heat Loss", "preBasementFoundationHeatingLossCalculated", "postBasementFoundationHeatingLossCalculated", GJ],
      ["Air Leakage/Ventilation Heat Loss", "preAirLeakageVentilationHeatingLossCalculated", "postAirLeakageVentilationHeatingLossCalculated", GJ],
    ],
  },
  {
    section: "Carbon Emissions",
    rows: [
      ["Annual Operational Carbon Emissions – Electricity", "preElecCarbon", "postElecCarbon", KG_CO2E],
      ["Annual Operational Carbon Emissions – Propane", "prePropaneCarbon", "postPropaneCarbon", KG_CO2E],
      ["Annual Operational Carbon Emissions – Oil", "preOilCarbon", "postOilCarbon", KG_CO2E],
      ["Annual Operational Carbon Emissions – Natural Gas", "preNaturalGasCarbon", "postNaturalGasCarbon", KG_CO2E],
      ["Annual Operational Carbon Emissions – Wood", "preWoodCarbon", "postWoodCarbon", KG_CO2E],
      ["Total Carbon Emissions", "preTotalCarbonEmissions", "postTotalCarbonEmissions", KG_CO2E],
    ],
  },
];

/** A row appears when either side has a value; the empty side shows "N/A", like the website. */
function beforeAndAfter(raw: RcCaseStudy): ScrapedBeforeAfterGroup[] {
  const groups: ScrapedBeforeAfterGroup[] = [];
  for (const { section, rows } of BEFORE_AFTER) {
    const shown = rows
      .map(([label, beforeField, afterField, format]) => ({
        label,
        before: formatValue(raw[beforeField], format),
        after: formatValue(raw[afterField], format),
      }))
      .filter((row) => row.before || row.after)
      .map((row) => ({ ...row, before: row.before || "N/A", after: row.after || "N/A" }));
    if (shown.length > 0) groups.push({ section, rows: shown });
  }
  return groups;
}

// ---------------------------------------------------------------------------------------------
// Upgrades, priorities, team
// ---------------------------------------------------------------------------------------------

const UPGRADE_FIELDS: [field: string, category: string][] = [
  ["envelopeImprovements", "Envelope Improvements"],
  ["windowDoorImprovments", "Windows and Door Improvements"], // sic: field name has a typo in the API
  ["mechanicalHeatingCoolingImprovements", "Mechanical: Heating and Cooling Improvements"],
  ["mechanicalVentilationImprovements", "Mechanical: Ventilation Improvements"],
  ["mechanicalHotWaterImprovements", "Mechanical: Hot Water Improvements"],
  ["renewablesStorageImprovements", "Renewables & Storage Improvements"],
  ["electricalImprovements", "Electrical Improvements"],
  ["applicancesLightingImprovements", "Appliances and Lighting Improvements"], // sic
  ["structureSpaceImprovements", "Structure and Space Improvements"],
  ["healthSafetySustainabilityImprovements", "Health, Safety & Sustainability Improvements"],
];

function upgrades(raw: RcCaseStudy): ScrapedUpgradeGroup[] {
  const groups = UPGRADE_FIELDS.map(([field, category]) => ({ category, items: multi(raw[field]) })).filter(
    (group) => group.items.length > 0
  );
  if (groups.length > 0) return groups;

  // Older case studies only have the free-text "Upgrade 1..10" fields.
  const freeText = Array.from({ length: 10 }, (_, i) => text(raw[`energyUpgrade${i + 1}`])).filter(Boolean);
  return freeText.length > 0 ? [{ category: "Upgrades", items: freeText }] : [];
}

/**
 * Priorities picked from the dropdown, then the bullet points of "Describe Goals" (goalsDescribe),
 * which the website lists with them (mostly the ReCover feasibility studies, which pick "Other").
 */
function priorities(raw: RcCaseStudy): string[] {
  const picked = [1, 2, 3].flatMap((i) => multi(raw[`projectPriority${i}`]));
  const goalBullets = storySections(raw.goalsDescribe, "Project Goals").flatMap((s) => s.bullets);
  return Array.from(new Set([...picked, ...goalBullets]));
}

/** The non-bullet text of "Describe Goals", shown as its own "Project Goals" section. */
function goalSections(raw: RcCaseStudy): ScrapedNarrativeSection[] {
  const sections = storySections(raw.goalsDescribe, "Project Goals").map((s) => ({ ...s, bullets: [] }));
  return sections.some((s) => s.paragraphs.length > 0)
    ? sections.filter((s, i) => s.paragraphs.length > 0 || i < sections.length - 1)
    : [];
}

function team(raw: RcCaseStudy): ScrapedTeamMember[] {
  const members: ScrapedTeamMember[] = [];
  // The data dictionary lists 8 members, but records can have more (projectTeamName9, 10, ...).
  for (let i = 1; i <= 30; i++) {
    const name = text(raw[`projectTeamName${i}`]);
    if (!name) continue;
    const role = text(raw[`projectTeamRole${i}`]);
    const url = text(raw[`projectTeamURL${i}`]);
    members.push({ name, ...(role && { role }), ...(url && { url }) });
  }
  if (members.length > 0) return members;

  // The list endpoint sends the team as one projectTeam array instead.
  const listTeam = Array.isArray(raw.projectTeam) ? (raw.projectTeam as Record<string, unknown>[]) : [];
  return listTeam
    .map((m) => ({ name: text(m?.name), role: text(m?.role), url: text(m?.url) }))
    .filter((m) => m.name)
    .map((m) => ({ name: m.name, ...(m.role && { role: m.role }), ...(m.url && { url: m.url }) }));
}

// ---------------------------------------------------------------------------------------------
// Story text -> sections. Owners write in a rich-text box (Markdown or HTML).
// ---------------------------------------------------------------------------------------------

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…",
};

function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match);
}

/** Inline Markdown -> plain text: [link](url) -> link, **bold** -> bold, `code` -> code. */
export function plainText(value: string): string {
  return decodeEntities(value)
    .replace(/<sup>\s*2\s*<\/sup>/gi, "²")
    .replace(/<sup>\s*3\s*<\/sup>/gi, "³")
    .replace(/<[^>]+>/g, "")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\((?:[^()]|\([^)]*\))*\)/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|[\s(])[*_]([^*_\s][^*_]*?)[*_](?=[\s).,;:!?]|$)/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\\([\\`*_{}[\]()#+\-.!])/g, "$1")
    .replace(/[ \t ]+/g, " ")
    .trim();
}

/** Converts HTML from a rich-text editor into the same line format as Markdown. */
function htmlToLines(html: string): string {
  return html
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_, inner) => `\n\n## ${inner.replace(/<[^>]+>/g, "")}\n\n`)
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|ul|ol|li|blockquote)>/gi, "\n\n")
    .replace(/<a\s[^>]*>([\s\S]*?)<\/a>/gi, "$1")
    .replace(/<[^>]+>/g, "");
}

const HEADING = /^#{1,6}\s+(.+?)\s*#*$/;

const hasContent = (s: ScrapedNarrativeSection) => s.paragraphs.length > 0 || s.bullets.length > 0;
/** "Getting to net-zero" and "Getting to Net Zero" count as the same heading. */
const sameHeading = (a: string, b: string) =>
  a.toLowerCase().replace(/[^a-z0-9]/g, "") === b.toLowerCase().replace(/[^a-z0-9]/g, "");
const BULLET = /^(?:[-*+•]|\d+[.)])\s+(.+)$/;

/**
 * Splits a story field into sections. Text before the first heading goes under `firstHeading`
 * ("The Retrofit Story", "Lessons Learned", ...); every Markdown heading (# to ######) inside the
 * text starts a new section. **Bold lines** stay normal paragraphs, as on the website.
 */
export function storySections(value: unknown, firstHeading: string): ScrapedNarrativeSection[] {
  let source = text(value);
  if (!source) return [];
  if (/<\/?(p|h[1-6]|ul|ol|li|br|div)\b/i.test(source)) source = htmlToLines(source);

  const sections: ScrapedNarrativeSection[] = [{ heading: firstHeading, paragraphs: [], bullets: [] }];
  let current = sections[0];

  for (const line of source.replace(/\r\n?/g, "\n").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || /^([-*_]\s*){3,}$/.test(trimmed)) continue; // blank line or --- divider

    const heading = trimmed.match(HEADING);
    if (heading) {
      const title = plainText(heading[1]);
      // The text often repeats the field's own title ("## Lessons Learned"): don't show it twice.
      if (current === sections[0] && !hasContent(current) && sameHeading(title, firstHeading)) continue;
      current = { heading: title, paragraphs: [], bullets: [] };
      sections.push(current);
      continue;
    }
    const bullet = trimmed.match(BULLET);
    if (bullet) {
      const item = plainText(bullet[1]);
      if (item) current.bullets.push(item);
      continue;
    }
    const paragraph = plainText(trimmed);
    if (paragraph) current.paragraphs.push(paragraph);
  }

  // A heading with nothing under it is kept when more sections follow (it's a parent heading,
  // e.g. "The Retrofit Story" followed by "### Overview"), and dropped at the end.
  while (sections.length > 0 && !hasContent(sections[sections.length - 1])) sections.pop();
  return sections;
}

// ---------------------------------------------------------------------------------------------
// Files: documents, drawings, photos, videos
// ---------------------------------------------------------------------------------------------

function documents(raw: RcCaseStudy): ScrapedDocument[] {
  return ["energyEvalBefore", "energyEvalAfter", "techDocument"].flatMap((field) =>
    files(raw[field]).map((file) => {
      const name = text(file.file_name) || text(file.title) || `file-${file.id}`;
      return {
        title: text(file.title) || name,
        url: `${PORTAL_ORIGIN}/downloadFile/${file.id}/${encodeURIComponent(name)}`,
      };
    })
  );
}

function media(value: unknown): ScrapedMediaItem[] {
  return files(value)
    .map((file) => ({ url: absoluteUrl(text(file.image_path)), caption: text(file.title) }))
    .filter((item) => item.url);
}

function photos(raw: RcCaseStudy): ScrapedPhotoPhase[] {
  return [
    { phase: "Pre Retrofit", items: media(raw.prePhotoData) },
    { phase: "During Construction", items: media(raw.midPhotoData) },
    { phase: "Post Retrofit", items: media(raw.postPhotoData) },
  ].filter((phase) => phase.items.length > 0);
}

function videos(raw: RcCaseStudy): { url: string }[] {
  const value = raw.videos;
  const urls = Array.isArray(value)
    ? value.map((v) => (typeof v === "string" ? v : text((v as { url?: unknown })?.url)))
    : text(value).split(/[\s,]+/);
  return urls.map((u) => u.trim()).filter((u) => /^https?:\/\//i.test(u)).map((url) => ({ url }));
}

// ---------------------------------------------------------------------------------------------
// Putting it together
// ---------------------------------------------------------------------------------------------

function metrics(raw: RcCaseStudy): ExtractedCaseStudyMetrics {
  const beforeGj = num(raw.preTotalAnnualConsumptionCalculated);
  const afterGj = num(raw.postTotalAnnualConsumptionCalculated);
  let energyReductionPercent = num(raw.annualEnergySavings);
  if (energyReductionPercent === undefined && beforeGj !== undefined && afterGj !== undefined && beforeGj > 0) {
    energyReductionPercent = Number((((beforeGj - afterGj) / beforeGj) * 100).toFixed(1));
  }
  const info = Object.fromEntries(projectInfo(raw).map((e) => [e.label, e.value]));
  const air = { decimals: 2, unit: "ACH50" };
  return {
    location: info["Location"] || undefined,
    floorArea: info["Post-Retrofit Total Floor Area"] || undefined,
    yearCompleted: info["Year Completed"] || undefined,
    beforeGj,
    afterGj,
    energyReductionPercent,
    annualEnergySavingsText: info["Annual Energy Savings"] || undefined,
    operationalCarbonSavingsText: info["Operational Carbon Savings"] || undefined,
    airtightnessBefore: formatValue(raw.preACH, air) || undefined,
    airtightnessAfter: formatValue(raw.postACH, air) || undefined,
  };
}

export function caseStudyDetails(raw: RcCaseStudy): ScrapedCaseStudyDetails {
  return {
    id: raw.id,
    slug: raw.urlSlug,
    sourceUrl: `${WEBSITE_ORIGIN}/case-studies/${raw.urlSlug}`,
    intro: plainText(text(raw.introDescription)),
    projectInfo: projectInfo(raw),
    team: team(raw),
    priorities: priorities(raw),
    upgrades: upgrades(raw),
    sections: [
      ...goalSections(raw),
      ...storySections(raw.whyRetrofitDescription, "The Retrofit Story"),
      ...storySections(raw.missingNzMeasuresDescription, "Getting to Net Zero"),
      ...storySections(raw.lessonsLearnedDescription, "Lessons Learned"),
    ],
    beforeAndAfter: beforeAndAfter(raw),
    documents: documents(raw),
    videos: videos(raw),
    drawings: media(raw.drawingImageData),
    photos: photos(raw),
  };
}

const orNotSpecified = (value: string) => value || "Not specified";

/** Full case study for the detail page and the advisor. */
export function mapCaseStudy(raw: RcCaseStudy): UnifiedCaseStudy {
  const details = caseStudyDetails(raw);
  const yearBuilt = num(raw.yearBuilt);
  return {
    id: raw.id,
    slug: raw.urlSlug,
    title: plainText(text(raw.caseStudyName)),
    internalLink: `/case-studies/${raw.urlSlug}`,
    externalUrl: details.sourceUrl,
    imageUrl: absoluteUrl(text(raw.featured_image?.image_path)),
    created: text(raw.publish_date) || text(raw.created_at),
    yearBuilt: yearBuilt && yearBuilt > 1700 ? yearBuilt : null,
    province: text(raw.locationProvince).toUpperCase(),
    houseType: orNotSpecified(text(raw.houseType)),
    structureType: orNotSpecified(text(raw.structureType)),
    climateZone: orNotSpecified(text(raw.climateZone)),
    retrofitPhasing: orNotSpecified(text(raw.retrofitPhasing)),
    retrofitType: orNotSpecified(text(raw.retrofitType)),
    performanceLevel: orNotSpecified(text(raw.performanceLevel)),
    teamMembers: details.team.map((m) => (m.role ? `${m.name} (${m.role})` : m.name)),
    fullDetails: details,
    metrics: metrics(raw),
  };
}

/** Columns for public.case_studies, without raw/hash/sync timestamps (the sync adds those). */
export function toCaseStudyRow(raw: RcCaseStudy): CaseStudyRow {
  const study = mapCaseStudy(raw);
  const details = study.fullDetails!;
  const lessons = details.sections.filter((s) => /lesson/i.test(s.heading));
  const nullable = (value: string) => value || null;
  const date = text(raw.publish_date);
  return {
    id: study.id,
    slug: study.slug,
    name: study.title,
    intro: nullable(details.intro),
    image_url: nullable(study.imageUrl),
    publish_date: /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : null,
    province: nullable(study.province),
    city: nullable(text(raw.locationCity)),
    house_type: nullable(text(raw.houseType)),
    year_built: study.yearBuilt,
    foundation_type: nullable(text(raw.foundationType)),
    structure_type: nullable(text(raw.structureType)),
    climate_zone: nullable(text(raw.climateZone)),
    retrofit_type: nullable(text(raw.retrofitType)),
    retrofit_phasing: nullable(text(raw.retrofitPhasing)),
    performance_level: nullable(text(raw.performanceLevel)),
    team: details.team,
    before_gj: study.metrics.beforeGj ?? null,
    after_gj: study.metrics.afterGj ?? null,
    energy_savings_pct: study.metrics.energyReductionPercent ?? null,
    lessons_learned: nullable(lessons.flatMap((s) => [...s.paragraphs, ...s.bullets]).join("\n")),
  };
}

/** The dropdown value, "Other" for a value the owner typed in, or "" when empty. */
function category(value: string | null, options: readonly string[]): string {
  if (!value) return "";
  return options.includes(value) ? value : "Other";
}

/** A Supabase row -> a card on the list page. */
export function rowToListItem(row: CaseStudyRow): CaseStudyListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.name,
    link: `/case-studies/${row.slug}`,
    image: row.image_url ?? "",
    created: row.publish_date ?? "",
    yearBuilt: row.year_built,
    province: row.province ?? "",
    city: row.city ?? "",
    team: (row.team ?? []).map((m) => m.name).join(" | "),
    filters: {
      locationprovince: category(row.province, PROVINCES),
      housetype: category(row.house_type, HOUSE_TYPES),
      structuretype: category(row.structure_type, STRUCTURE_TYPES),
      climatezone: category(row.climate_zone, CLIMATE_ZONES),
      retrofitphasing: category(row.retrofit_phasing, RETROFIT_PHASING),
      retrofittype: category(row.retrofit_type, RETROFIT_TYPES),
      performancelevel: category(row.performance_level, PERFORMANCE_LEVELS),
    },
  };
}
