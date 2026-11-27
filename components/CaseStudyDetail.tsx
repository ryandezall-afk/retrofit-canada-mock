import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Layers,
  MapPin,
  Target,
  Users,
  Video,
} from "lucide-react";
import type { UnifiedCaseStudy } from "@/lib/case-studies";

interface CaseStudyDetailProps {
  study: UnifiedCaseStudy;
}

export default function CaseStudyDetail({ study }: CaseStudyDetailProps) {
  const details = study.fullDetails;
  const metrics = study.metrics;
  const hasMetricsBar =
    metrics.beforeGj !== undefined ||
    metrics.afterGj !== undefined ||
    Boolean(metrics.annualEnergySavingsText) ||
    Boolean(metrics.airtightnessAfter) ||
    Boolean(metrics.operationalCarbonSavingsText);

  return (
    <div className="bg-slate-50 min-h-screen py-10 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Breadcrumbs */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/" className="hover:text-rc-red transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link
            href="/case-studies"
            className="hover:text-rc-red transition-colors"
          >
            Case Studies
          </Link>
          <span>/</span>
          <span className="text-slate-800">{study.title}</span>
        </div>

        {/* Hero Card */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-lg">
          <div className="relative h-72 md:h-96 bg-slate-900 overflow-hidden">
            {study.imageUrl ? (
              <img
                src={study.imageUrl}
                alt={study.title}
                className="w-full h-full object-cover opacity-85"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                No Project Photo Available
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-transparent" />

            <div className="absolute bottom-6 left-6 right-6 space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-rc-navy text-white shadow-sm">
                  {study.houseType}
                </span>
                {study.yearBuilt && (
                  <span className="px-3 py-1 rounded-md text-xs font-semibold bg-white text-slate-900 shadow-sm">
                    Built {study.yearBuilt}
                  </span>
                )}
                {study.performanceLevel && (
                  <span className="px-3 py-1 rounded-md text-xs font-bold bg-rc-amber text-slate-950 shadow-sm">
                    {study.performanceLevel}
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                {study.title}
              </h1>

              <div className="flex flex-wrap items-center gap-6 text-xs text-slate-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rc-amber" />
                  <span>
                    {metrics.location ?? study.province} (Climate Zone{" "}
                    {study.climateZone})
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-rc-amber" />
                  <span>
                    {metrics.floorArea
                      ? `${metrics.floorArea} • ${study.structureType}`
                      : study.structureType}
                  </span>
                </span>
                {(metrics.yearCompleted || study.created) && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-rc-amber" />
                    <span>
                      {metrics.yearCompleted
                        ? `Completed ${metrics.yearCompleted}`
                        : `Added ${study.created}`}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Key Performance Bar (from original Retrofit Canada page data) */}
          {hasMetricsBar && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-900 text-white border-t border-slate-800">
              {(metrics.beforeGj !== undefined ||
                metrics.afterGj !== undefined) && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">
                    Total Annual Consumption
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                      {metrics.afterGj ?? "—"}
                    </span>
                    <span className="text-xs text-slate-400">GJ/yr</span>
                    {metrics.beforeGj !== undefined && (
                      <span className="text-xs text-rose-400 line-through ml-1">
                        from {metrics.beforeGj}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {metrics.annualEnergySavingsText && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">
                    Annual Energy Savings
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-amber-400">
                    {metrics.annualEnergySavingsText}
                  </div>
                  <span className="text-xs text-slate-400 block">
                    {study.retrofitType}
                  </span>
                </div>
              )}

              {metrics.airtightnessAfter && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">
                    Air Tightness
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-teal-400">
                      {metrics.airtightnessAfter}
                    </span>
                  </div>
                  {metrics.airtightnessBefore && (
                    <span className="text-xs text-slate-400 block">
                      Down from {metrics.airtightnessBefore}
                    </span>
                  )}
                </div>
              )}

              {metrics.operationalCarbonSavingsText && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">
                    Operational Carbon Savings
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400">
                    {metrics.operationalCarbonSavingsText}
                  </div>
                  <span className="text-xs text-slate-400 block">
                    Annual GHG Reduction
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Content + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-8">
            {/* Intro Summary */}
            {details?.intro && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
                <p className="text-lg font-medium text-rc-navy leading-relaxed">
                  {details.intro}
                </p>
              </div>
            )}

            {/* Project Info Table */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <h2 className="text-2xl font-black text-rc-navy tracking-tight">
                Project Information
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                {(details && details.projectInfo.length > 0
                  ? details.projectInfo
                  : [
                      { label: "Province", value: study.province },
                      {
                        label: "Year Built",
                        value: study.yearBuilt
                          ? String(study.yearBuilt)
                          : "Not specified",
                      },
                      { label: "Climate Zone", value: study.climateZone },
                      { label: "Structure Type", value: study.structureType },
                      { label: "Retrofit Type", value: study.retrofitType },
                      {
                        label: "Retrofit Phasing",
                        value: study.retrofitPhasing,
                      },
                    ]
                ).map((item) => (
                  <div
                    key={item.label}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-100"
                  >
                    <span className="text-xs text-slate-500 block">
                      {item.label}
                    </span>
                    <strong className="text-rc-navy break-words">
                      {item.value}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Upgrades Implemented */}
            {details && details.upgrades.length > 0 && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <h2 className="text-2xl font-black text-rc-navy tracking-tight flex items-center gap-2">
                  <Layers className="w-6 h-6 text-rc-red" />
                  <span>Upgrades Implemented</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {details.upgrades.map((group) => (
                    <div
                      key={group.category}
                      className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-3"
                    >
                      <h3 className="font-bold text-xs uppercase tracking-wider text-rc-navy">
                        {group.category}
                      </h3>
                      <ul className="space-y-2">
                        {group.items.map((item, idx) => (
                          <li
                            key={`${item}-${idx}`}
                            className="flex items-start gap-2 text-sm text-slate-800"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full Project Description / Story / Lessons Learned */}
            {details && details.sections.length > 0 && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <h2 className="text-2xl font-black text-rc-navy tracking-tight">
                  Project Description
                </h2>

                <div className="space-y-6">
                  {details.sections.map((sec, idx) => (
                    <div
                      key={`${sec.heading}-${idx}`}
                      className="space-y-3 border-b border-slate-100 pb-6 last:border-b-0 last:pb-0"
                    >
                      <h3 className="text-lg font-bold text-rc-navy">
                        {sec.heading}
                      </h3>
                      {sec.paragraphs.map((p, pIdx) => (
                        <p
                          key={pIdx}
                          className="text-sm sm:text-base text-slate-700 leading-relaxed"
                        >
                          {p}
                        </p>
                      ))}
                      {sec.bullets.length > 0 && (
                        <ul className="space-y-2 pl-1">
                          {sec.bullets.map((b, bIdx) => (
                            <li
                              key={bIdx}
                              className="flex items-start gap-2.5 text-sm text-slate-700 leading-relaxed"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-1" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Before & After Comparison Tables */}
            {details && details.beforeAndAfter.length > 0 && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <h2 className="text-2xl font-black text-rc-navy tracking-tight">
                  Before &amp; After Specifications
                </h2>

                <div className="space-y-4">
                  {details.beforeAndAfter.map((table, idx) => (
                    <details
                      key={`${table.section}-${idx}`}
                      open={idx < 3}
                      className="rounded-2xl border border-slate-200 overflow-hidden"
                    >
                      <summary className="cursor-pointer bg-slate-100 px-5 py-3.5 font-saira text-base font-bold text-rc-navy hover:bg-slate-200/70 transition-colors">
                        {table.section} ({table.rows.length})
                      </summary>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                            <tr>
                              <th className="py-2.5 px-4 font-semibold w-1/3">
                                Metric
                              </th>
                              <th className="py-2.5 px-4 font-semibold w-1/3">
                                Before
                              </th>
                              <th className="py-2.5 px-4 font-semibold w-1/3">
                                After
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {table.rows.map((row, rIdx) => (
                              <tr key={`${row.label}-${rIdx}`}>
                                <td className="py-3 px-4 font-medium text-rc-navy align-top">
                                  {row.label}
                                </td>
                                <td className="py-3 px-4 text-slate-600 align-top">
                                  {row.before}
                                </td>
                                <td className="py-3 px-4 text-emerald-900 font-medium align-top">
                                  {row.after}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {/* Drawings & Photos */}
            {details &&
              (details.drawings.length > 0 || details.photos.length > 0) && (
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  <h2 className="text-2xl font-black text-rc-navy tracking-tight flex items-center gap-2">
                    <ImageIcon className="w-6 h-6 text-rc-red" />
                    <span>Project Photos &amp; Drawings</span>
                  </h2>

                  {details.drawings.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                        Drawings or Details
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {details.drawings.map((drawing, idx) => (
                          <a
                            key={`${drawing.url}-${idx}`}
                            href={drawing.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 hover:shadow-md transition"
                          >
                            <div className="h-36 overflow-hidden">
                              <img
                                src={drawing.url}
                                alt={drawing.caption || "Project drawing"}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            {drawing.caption && (
                              <p className="p-2 text-[11px] text-slate-600 line-clamp-2">
                                {drawing.caption}
                              </p>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {details.photos.map((phaseGroup) => (
                    <div key={phaseGroup.phase} className="space-y-3">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                        {phaseGroup.phase}
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {phaseGroup.items.map((photo, idx) => (
                          <a
                            key={`${photo.url}-${idx}`}
                            href={photo.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 hover:shadow-md transition"
                          >
                            <div className="h-36 overflow-hidden">
                              <img
                                src={photo.url}
                                alt={photo.caption || phaseGroup.phase}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            {photo.caption && (
                              <p className="p-2 text-[11px] text-slate-600 line-clamp-2">
                                {photo.caption}
                              </p>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Project Priorities */}
            {details && details.priorities.length > 0 && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-rc-navy text-sm uppercase tracking-wider flex items-center gap-2">
                  <Target className="w-4 h-4 text-rc-red" />
                  <span>Project Priorities</span>
                </h3>
                <ul className="space-y-2 text-xs">
                  {details.priorities.map((prio, idx) => (
                    <li
                      key={`${prio}-${idx}`}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-medium text-slate-800"
                    >
                      {prio}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Project Team */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-rc-navy text-sm uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-rc-red" />
                <span>Project Team &amp; Partners</span>
              </h3>

              {details && details.team.length > 0 ? (
                <ul className="space-y-2 text-xs">
                  {details.team.map((member, idx) => (
                    <li
                      key={`${member.name}-${idx}`}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100"
                    >
                      {member.url ? (
                        <a
                          href={member.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="font-semibold text-rc-navy hover:text-rc-red hover:underline inline-flex items-center gap-1"
                        >
                          <span>{member.name}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="font-semibold text-rc-navy">
                          {member.name}
                        </span>
                      )}
                      {member.role && (
                        <span className="block text-[11px] text-slate-500 mt-0.5">
                          {member.role}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : study.teamMembers.length > 0 ? (
                <ul className="space-y-2 text-xs">
                  {study.teamMembers.map((member, idx) => (
                    <li
                      key={`${member}-${idx}`}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-medium text-slate-800"
                    >
                      {member}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">
                  Team details not listed for this case study.
                </p>
              )}
            </div>

            {/* Technical Documents */}
            {details && details.documents.length > 0 && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-rc-navy text-sm uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-rc-red" />
                  <span>Technical Documents</span>
                </h3>
                <ul className="space-y-2 text-xs">
                  {details.documents.map((doc, idx) => (
                    <li key={`${doc.url}-${idx}`}>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex items-center justify-between gap-2 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 font-medium text-rc-navy transition"
                      >
                        <span className="line-clamp-2">{doc.title}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 text-rc-red" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Videos */}
            {details && details.videos.length > 0 && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-rc-navy text-sm uppercase tracking-wider flex items-center gap-2">
                  <Video className="w-4 h-4 text-rc-red" />
                  <span>Project Video</span>
                </h3>
                {details.videos.map((vid, idx) => (
                  <a
                    key={`${vid.url}-${idx}`}
                    href={vid.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center justify-between gap-2 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 text-xs font-medium text-rc-navy transition"
                  >
                    <span className="truncate">{vid.url}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 text-rc-red" />
                  </a>
                ))}
              </div>
            )}

            {/* Navigation Actions */}
            <div className="space-y-3">
              <Link
                href="/retrofit-ai"
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-rc-red hover:bg-red-700 transition-colors shadow-sm"
              >
                <span>Start Retrofit AI Assessment</span>
              </Link>

              <a
                href={study.externalUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-rc-navy bg-white hover:bg-slate-100 border border-slate-200 transition-colors shadow-sm"
              >
                <span>View Original on Retrofit Canada</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <Link
                href="/case-studies"
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to All Case Studies</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
