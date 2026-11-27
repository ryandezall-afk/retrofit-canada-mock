import "server-only";

import { mapCaseStudy } from "@/lib/retrofit-canada/mapper";
import type { RcCaseStudy } from "@/lib/retrofit-canada/types";
import { getSupabaseReader } from "@/lib/server/supabase";

/**
 * Full detail on the few case studies that matched a homeowner, trimmed down to what Gemini
 * needs to compare against their answers: what the house was like before, what was done,
 * what it was like after, and what the team learned.
 */
export interface CaseStudyPromptDetail {
  id: string;
  projectInfo: Record<string, string>;
  priorities: string[];
  upgradesDone: Record<string, string[]>;
  beforeAndAfter: Record<string, { before: string; after: string }>;
  narrative: Record<string, string>;
}

const MAX_NARRATIVE_CHARS = 900;

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function isEmptyValue(value: string | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "" || v === "-" || v === "n/a" || v === "not specified";
}

function toPromptDetail(raw: RcCaseStudy): CaseStudyPromptDetail | null {
  const study = mapCaseStudy(raw);
  const details = study.fullDetails;
  if (!details) return null;

  const projectInfo: Record<string, string> = {};
  for (const { label, value } of details.projectInfo) {
    if (!isEmptyValue(value)) projectInfo[label] = value;
  }

  const upgradesDone: Record<string, string[]> = {};
  for (const group of details.upgrades) {
    if (group.items.length > 0) upgradesDone[group.category] = group.items;
  }

  const beforeAndAfter: Record<string, { before: string; after: string }> = {};
  for (const group of details.beforeAndAfter) {
    for (const row of group.rows) {
      if (isEmptyValue(row.before) && isEmptyValue(row.after)) continue;
      beforeAndAfter[`${group.section}: ${row.label}`] = {
        before: row.before || "—",
        after: row.after || "—",
      };
    }
  }

  const narrative: Record<string, string> = {};
  for (const section of details.sections) {
    const text = [...section.paragraphs, ...section.bullets.map((b) => `• ${b}`)].join(" ");
    if (text.trim()) narrative[section.heading] = clip(text, MAX_NARRATIVE_CHARS);
  }

  return {
    id: `rc-${study.id}`,
    projectInfo,
    priorities: details.priorities,
    upgradesDone,
    beforeAndAfter,
    narrative,
  };
}

/**
 * Loads full details for the given case study slugs in one Supabase query.
 * Returns an empty list (never throws) so the advisor still works on summaries alone.
 */
export async function getCaseStudyDetailsForPrompt(
  slugs: string[]
): Promise<CaseStudyPromptDetail[]> {
  if (slugs.length === 0) return [];
  const db = getSupabaseReader();
  if (!db) return [];

  try {
    const { data, error } = await db
      .from("case_studies")
      .select("slug, raw")
      .eq("is_active", true)
      .in("slug", slugs);
    if (error) throw new Error(error.message);

    const bySlug = new Map(
      (data ?? []).map((row) => [row.slug as string, row.raw as RcCaseStudy])
    );
    return slugs
      .map((slug) => bySlug.get(slug))
      .filter((raw): raw is RcCaseStudy => Boolean(raw))
      .map(toPromptDetail)
      .filter((d): d is CaseStudyPromptDetail => d !== null);
  } catch (err) {
    console.error("[advisor] Could not load case study details for Gemini.", err);
    return [];
  }
}
