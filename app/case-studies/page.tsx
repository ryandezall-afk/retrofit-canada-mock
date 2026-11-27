import CaseStudiesBrowser from "@/components/CaseStudiesBrowser";
import { buildFilterGroups, getCaseStudyListItems } from "@/lib/case-studies";

// Built once, then rebuilt at most daily (and right after each monthly sync).
export const revalidate = 86400;

export const metadata = {
  title: "Case Studies | Retrofit Canada",
};

/** Loads the case studies from Supabase on the server; the browser only gets the cards. */
export default async function CaseStudiesPage() {
  const studies = await getCaseStudyListItems();
  return <CaseStudiesBrowser studies={studies} filterGroups={buildFilterGroups(studies)} />;
}
