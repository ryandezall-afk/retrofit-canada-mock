/**
 * Shapes the case study pages, the list page and the advisor work with.
 * Kept free of server code so Client Components can import these types.
 *
 * The "Scraped..." names come from the first version, which copied the website's pages.
 * The data now comes from Retrofit Canada's API (see lib/retrofit-canada/mapper.ts),
 * mapped into the same shapes so the page components didn't need to change.
 */

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

/** One case study card on /case-studies, with the values its filters use. */
export interface CaseStudyListItem {
  id: number;
  slug: string;
  title: string;
  link: string;
  image: string;
  created: string;
  yearBuilt: number | null;
  province: string;
  city: string;
  /** Team names joined with " | ", for the "Project Team" search box. */
  team: string;
  /**
   * Filter values. A value Retrofit Canada's dropdown doesn't list (the owner typed their own,
   * e.g. "Part 3" for a house type) is grouped under "Other", like on retrofitcanada.com.
   */
  filters: {
    locationprovince: string;
    housetype: string;
    structuretype: string;
    climatezone: string;
    retrofitphasing: string;
    retrofittype: string;
    performancelevel: string;
  };
}

export type CaseStudyFilterKey = keyof CaseStudyListItem["filters"];

export interface CaseStudyFilterGroup {
  title: string;
  options: { value: string; label: string }[];
}

/** A row of the Supabase table public.case_studies (see supabase/migrations). */
export interface CaseStudyRow {
  id: number;
  slug: string;
  name: string;
  intro: string | null;
  image_url: string | null;
  publish_date: string | null;
  province: string | null;
  city: string | null;
  house_type: string | null;
  year_built: number | null;
  foundation_type: string | null;
  structure_type: string | null;
  climate_zone: string | null;
  retrofit_type: string | null;
  retrofit_phasing: string | null;
  performance_level: string | null;
  team: ScrapedTeamMember[];
  before_gj: number | null;
  after_gj: number | null;
  energy_savings_pct: number | null;
  lessons_learned: string | null;
}
