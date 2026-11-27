import React from "react";
import { notFound } from "next/navigation";
import CaseStudyDetail from "@/components/CaseStudyDetail";
import {
  getAllCaseStudySlugs,
  getUnifiedCaseStudyBySlug,
} from "@/lib/case-studies";

// Built once, then rebuilt at most daily (and right after each monthly sync).
// A case study added after the last build is built the first time someone opens it.
export const revalidate = 86400;

interface CaseStudyPageProps {
  params: {
    id: string;
  };
}

export async function generateStaticParams() {
  const slugs = await getAllCaseStudySlugs();
  return slugs.map((slug) => ({ id: slug }));
}

export default async function SingleCaseStudyPage({ params }: CaseStudyPageProps) {
  let slug = params.id;
  try {
    slug = decodeURIComponent(slug);
  } catch {
    // already decoded
  }
  const study = await getUnifiedCaseStudyBySlug(slug);

  if (!study) {
    notFound();
  }

  return <CaseStudyDetail study={study} />;
}
