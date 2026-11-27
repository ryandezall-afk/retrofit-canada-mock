"use client";

import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  ExternalLink,
  FileDown,
  Flame,
  Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { RetrofitAssessmentResult } from "@/types";

interface AssessmentResultsProps {
  result: RetrofitAssessmentResult;
  onReviewAnswers: () => void;
  onStartOver: () => void;
}

function getSourceLabel(source: string): string {
  switch (source) {
    case "ai_estimate":
      return "AI Estimate";
    case "retrofit_canada_mock_api":
      return "Mock RC API";
    default:
      return "Sample Data Estimate";
  }
}

export default function AssessmentResults({
  result,
  onReviewAnswers,
  onStartOver,
}: AssessmentResultsProps) {
  const isGemini = result.mode === "gemini";

  const handleSavePdf = () => {
    const previousTitle = document.title;
    const safeFsa = result.propertySummary.postalFsa || "Home";
    const safeProv = result.propertySummary.province || "CA";
    document.title = `Retrofit-Canada-Assessment-${safeFsa}-${safeProv}`;

    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };

    window.addEventListener("afterprint", restoreTitle);
    window.print();
  };

  const formattedDate = new Date(result.createdAt).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="mx-auto mt-8 w-full max-w-3xl space-y-6 print:mt-0 print:max-w-none print:space-y-4">
      {/* Print-only header */}
      <div className="hidden items-center justify-between border-b border-slate-300 pb-3 print:flex">
        <div>
          <p className="font-saira text-lg font-bold text-rc-navy">
            Retrofit Canada — AI Retrofit Assessment Report
          </p>
          <p className="text-xs text-slate-500">
            Generated {formattedDate} • ID: {result.assessmentId}
          </p>
        </div>
        <span className="text-xs font-semibold text-rc-navy">
          {result.propertySummary.province} ({result.propertySummary.postalFsa})
        </span>
      </div>

      {/* Header Summary Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md sm:p-8 print:break-inside-avoid print:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Retrofit Assessment Report
              </p>
              <h2 className="font-saira text-2xl font-bold text-rc-navy sm:text-3xl">
                {result.overallReadiness}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                isGemini
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isGemini
                ? `Gemini AI (${result.modelUsed})`
                : "Mock Assessment Mode"}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              <Database className="h-3.5 w-3.5" />
              Mock RC API ({result.cacheMeta.cached ? "Cache Hit" : "Synced"} •{" "}
              {result.cacheMeta.upstreamPings} ping
              {result.cacheMeta.upstreamPings === 1 ? "" : "s"})
            </span>
          </div>
        </div>

        {result.fallbackReason && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <span>{result.fallbackReason}</span>
          </div>
        )}

        <p className="mt-4 text-sm leading-relaxed text-slate-700 sm:text-base">
          {result.executiveSummary}
        </p>

        {/* Property & Savings Highlights */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">Home Profile</p>
            <p className="mt-1 font-saira text-base font-bold text-rc-navy">
              {result.propertySummary.province} ({result.propertySummary.postalFsa})
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              {result.propertySummary.homeType} • {result.propertySummary.yearBuiltLabel}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">
              Est. Baseline Energy Cost
            </p>
            <p className="mt-1 font-saira text-lg font-bold text-rc-navy">
              ~{formatCurrency(result.estimatedBaselineAnnualCost)} / yr
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              Primary fuel: {result.propertySummary.heatingFuel}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-medium text-emerald-800">
              Est. Annual Savings Potential
            </p>
            <p className="mt-1 font-saira text-lg font-bold text-emerald-900">
              {formatCurrency(result.estimatedAnnualSavingsMin)} –{" "}
              {formatCurrency(result.estimatedAnnualSavingsMax)} / yr
            </p>
            <p className="mt-0.5 text-xs text-emerald-700">
              Estimate across recommended steps
            </p>
          </div>
        </div>
      </div>

      {/* Prioritized Upgrade Recommendations */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md sm:p-8 print:shadow-none">
        <h3 className="font-saira text-xl font-bold text-rc-navy sm:text-2xl">
          Prioritized Retrofit Plan
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Sequenced using Retrofit Canada&apos;s envelope-first approach. All costs
          and savings are estimates.
        </p>

        <div className="mt-5 space-y-4">
          {result.recommendations.map((rec) => (
            <div
              key={`${rec.rank}-${rec.title}`}
              className="rounded-xl border border-slate-200 p-4 sm:p-5 print:break-inside-avoid"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rc-navy text-xs font-bold text-white">
                    {rec.rank}
                  </span>
                  <div>
                    <h4 className="font-saira text-base font-bold text-rc-navy sm:text-lg">
                      {rec.title}
                    </h4>
                    <p className="text-xs text-slate-500">{rec.category}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-rc-red">
                    {rec.priorityLabel}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    {getSourceLabel(rec.source)}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                {rec.rationale}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-4">
                <div>
                  <span className="block text-slate-500">Est. Cost (CAD)</span>
                  <span className="font-semibold text-rc-navy">
                    {formatCurrency(rec.estimatedCostMin)} –{" "}
                    {formatCurrency(rec.estimatedCostMax)}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500">Est. Savings / yr</span>
                  <span className="font-semibold text-emerald-700">
                    {formatCurrency(rec.estimatedAnnualSavingsMin)} –{" "}
                    {formatCurrency(rec.estimatedAnnualSavingsMax)}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500">Energy Reduction</span>
                  <span className="font-semibold text-rc-navy">
                    {rec.energyReductionRange}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500">Est. Payback</span>
                  <span className="font-semibold text-rc-navy">
                    {rec.estimatedPaybackYears}
                  </span>
                </div>
              </div>

              {rec.eligibleRebates.length > 0 && (
                <p className="mt-2.5 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">
                    Potential funding:
                  </span>{" "}
                  {rec.eligibleRebates.join(" • ")}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Rebates & Financing */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md sm:p-8 print:break-inside-avoid print:shadow-none">
        <h3 className="font-saira text-xl font-bold text-rc-navy">
          Matching Rebates &amp; Financing ({result.propertySummary.province})
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {result.rebates.map((rebate) => (
            <div
              key={rebate.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 p-4 print:break-inside-avoid"
            >
              <div>
                <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-rc-navy">
                  {rebate.level}
                </span>
                <h4 className="mt-2 font-saira text-base font-bold text-rc-navy">
                  {rebate.name}
                </h4>
                <p className="mt-1 text-xs font-semibold text-emerald-700">
                  {rebate.estimatedValue}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {rebate.summary}
                </p>
                <p className="mt-2 text-[11px] text-slate-500">
                  {rebate.eligibilityNotes}
                </p>
              </div>
              <a
                href={rebate.url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-rc-red hover:underline"
              >
                Program details <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Matched Case Studies from Mock Retrofit Canada API */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md sm:p-8 print:break-inside-avoid print:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-saira text-xl font-bold text-rc-navy">
              Similar Retrofit Canada Case Studies
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Pulled from the cached Mock Retrofit Canada API (
              {result.cacheMeta.totalRecordsAvailable} records indexed).
            </p>
          </div>
          <Link
            href="/case-studies"
            className="text-xs font-semibold text-rc-red hover:underline print:hidden"
          >
            Browse full library
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {result.matchedCaseStudies.map((cs) => {
            const isInternal = cs.link.startsWith("/");
            return (
              <div
                key={cs.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 p-4 print:break-inside-avoid"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-rc-navy">
                      {cs.province}
                      {cs.yearBuilt ? ` • ${cs.yearBuilt}` : ""}
                    </span>
                    <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-800">
                      {cs.performanceLevel}
                    </span>
                  </div>

                  <h4 className="mt-2 font-saira text-base font-bold text-rc-navy">
                    {cs.title}
                  </h4>

                  <p className="mt-1 text-xs text-slate-600">
                    {cs.houseType} • {cs.retrofitType}
                  </p>

                  {cs.hasDetailedMetrics &&
                    cs.beforeGj !== undefined &&
                    cs.afterGj !== undefined && (
                      <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-700">
                        <Flame className="h-3.5 w-3.5 shrink-0 text-rc-red" />
                        <span>
                          {cs.beforeGj} → {cs.afterGj} GJ/yr
                          {cs.energyReductionPercent
                            ? ` (-${cs.energyReductionPercent}%)`
                            : ""}
                        </span>
                      </div>
                    )}

                  <p className="mt-2 text-[11px] text-slate-500">
                    Match: {cs.matchReasons.join(" • ")}
                  </p>
                </div>

                {isInternal ? (
                  <Link
                    href={cs.link}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-rc-red hover:underline"
                  >
                    View case study
                  </Link>
                ) : (
                  <a
                    href={cs.link}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-rc-red hover:underline"
                  >
                    View on Retrofit Canada <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Disclaimer & Actions */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-xs leading-relaxed text-slate-600 print:break-inside-avoid">
        <strong className="text-rc-navy">Important Disclaimer:</strong>{" "}
        {result.disclaimer}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row print:hidden">
        <button
          type="button"
          onClick={handleSavePdf}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rc-red px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          <FileDown className="h-4 w-4" />
          Save Assessment as PDF
        </button>

        <button
          type="button"
          onClick={onReviewAnswers}
          className="flex-1 rounded-xl bg-rc-navy px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#404660]"
        >
          Review / Edit My Answers
        </button>

        <button
          type="button"
          onClick={onStartOver}
          className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-rc-navy transition hover:bg-slate-100"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}
