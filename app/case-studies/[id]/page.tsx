import React from "react";
import { notFound } from "next/navigation";
import CaseStudyDetail from "@/components/CaseStudyDetail";
import {
  getAllCaseStudySlugs,
  getUnifiedCaseStudyBySlug,
} from "@/lib/case-studies";

interface CaseStudyPageProps {
  params: {
    id: string;
  };
}

export function generateStaticParams() {
  return getAllCaseStudySlugs().map((slug) => ({
    id: slug,
  }));
}

export default function SingleCaseStudyPage({ params }: CaseStudyPageProps) {
  const study = getUnifiedCaseStudyBySlug(params.id);

  if (!study) {
    notFound();
  }

  return <CaseStudyDetail study={study} />;
}
