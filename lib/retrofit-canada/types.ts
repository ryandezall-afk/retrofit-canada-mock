/**
 * Shapes returned by Retrofit Canada's public API (https://portal.retrofitcanada.com/api/v1).
 * Swagger: https://portal.retrofitcanada.com/api/documentation
 *
 * A case study record has ~245 possible fields (see GET /properties). Only fields the case study
 * owner filled in are present. Empty values come back as "" (even for numbers), and multi-select
 * values come back as one comma-separated string, e.g. "Electrical Service Upgrade,Full Electrification".
 */

/** An uploaded file (photo, drawing or PDF). */
export interface RcFile {
  id: number;
  title?: string | null;
  image_path?: string | null;
  file_name?: string | null;
}

/** One case study as returned by GET /caseStudies/lookup/{slug}. */
export interface RcCaseStudy {
  id: number;
  urlSlug: string;
  caseStudyName: string;
  introDescription?: string;
  publish_date?: string;
  created_at?: string;
  isFeatured?: number;
  featured_image?: RcFile | null;
  /** Any other field from the data dictionary (text, number, select, files, url). */
  [field: string]: unknown;
}

/** GET /caseStudies returns { data: { caseStudies: [...] } }. */
export interface RcCaseStudyListResponse {
  data: { caseStudies: RcCaseStudy[] };
}

/** GET /caseStudies/lookup/{slug} returns { data: { caseStudy: {...} } }. */
export interface RcCaseStudyResponse {
  data: { caseStudy: RcCaseStudy };
}
