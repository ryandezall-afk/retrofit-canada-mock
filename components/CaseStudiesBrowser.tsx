"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import type {
  CaseStudyFilterGroup,
  CaseStudyFilterKey,
  CaseStudyListItem,
} from '@/lib/case-study-types';

interface CaseStudiesBrowserProps {
  /** Published case studies, loaded from Supabase by app/case-studies/page.tsx. */
  studies: CaseStudyListItem[];
  /** Filter checkboxes built from the values the case studies use. */
  filterGroups: Record<CaseStudyFilterKey, CaseStudyFilterGroup>;
}

/** Search, filter and sort the case study cards (runs in the browser). */
export default function CaseStudiesBrowser({ studies, filterGroups }: CaseStudiesBrowserProps) {
  const [searchProject, setSearchProject] = useState('');
  const [searchTeam, setSearchTeam] = useState('');
  const [yearFrom, setYearFrom] = useState(1850);
  const [yearTo, setYearTo] = useState(2050);
  const [selectedSort, setSelectedSort] = useState('alphabetical');

  // Checkbox filters state: groupKey -> Set of checked values
  const [selectedFilters, setSelectedFilters] = useState<Record<CaseStudyFilterKey, string[]>>({
    locationprovince: [],
    housetype: [],
    structuretype: [],
    climatezone: [],
    retrofitphasing: [],
    retrofittype: [],
    performancelevel: [],
  });

  // Track accordion open/closed states
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    yearbuilt: true,
    locationprovince: true,
    housetype: true,
    structuretype: true,
    climatezone: true,
    retrofitphasing: true,
    retrofittype: true,
    performancelevel: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleCheckboxChange = (group: CaseStudyFilterKey, value: string) => {
    setSelectedFilters((prev) => {
      const current = prev[group] || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [group]: updated };
    });
  };

  const handleResetFilters = () => {
    setSearchProject('');
    setSearchTeam('');
    setYearFrom(1850);
    setYearTo(2050);
    setSelectedSort('alphabetical');
    setSelectedFilters({
      locationprovince: [],
      housetype: [],
      structuretype: [],
      climatezone: [],
      retrofitphasing: [],
      retrofittype: [],
      performancelevel: [],
    });
  };

  const filteredAndSortedStudies = useMemo(() => {
    const filterKeys = Object.keys(selectedFilters) as CaseStudyFilterKey[];
    return [...studies]
      .filter((study) => {
        // Project name filter
        if (searchProject.trim()) {
          const q = searchProject.toLowerCase();
          if (!study.title.toLowerCase().includes(q)) {
            return false;
          }
        }

        // Team filter
        if (searchTeam.trim()) {
          const q = searchTeam.toLowerCase();
          if (!study.team.toLowerCase().includes(q)) {
            return false;
          }
        }

        // Year built filter
        if (study.yearBuilt !== null && study.yearBuilt > 0) {
          if (study.yearBuilt < yearFrom || study.yearBuilt > yearTo) {
            return false;
          }
        }

        // Checkbox filters (province, building type, structure, climate zone, staged, retrofit type, performance)
        for (const key of filterKeys) {
          const selected = selectedFilters[key];
          if (selected.length > 0 && !selected.includes(study.filters[key])) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (selectedSort === 'alphabetical') {
          return a.title.localeCompare(b.title);
        } else if (selectedSort === 'alphabeticalReverse') {
          return b.title.localeCompare(a.title);
        } else if (selectedSort === 'created') {
          return b.created.localeCompare(a.created);
        } else if (selectedSort === 'createdReverse') {
          return a.created.localeCompare(b.created);
        }
        return 0;
      });
  }, [studies, searchProject, searchTeam, yearFrom, yearTo, selectedFilters, selectedSort]);

  return (
    <div className="bg-white min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <h1 className="text-4xl sm:text-5xl font-bold font-saira text-rc-dark tracking-tight mb-6">
          Case Studies
        </h1>

        <hr className="border-gray-200 mb-6" />

        {/* API / Submit info banner */}
        <div className="text-center text-xs sm:text-sm text-gray-700 leading-relaxed mb-8">
          <p>
            To access our case study library through an API, please{' '}
            <Link href="/contact" className="underline hover:text-rc-red font-medium">
              contact us
            </Link>
            .<br />
            To submit a case study to Retrofit Canada, please{' '}
            <Link href="/news" className="underline hover:text-rc-red font-medium">
              click here to learn more
            </Link>
            .
          </p>
        </div>

        {/* Sort Controls Bar */}
        <div className="flex justify-end mb-6">
          <select
            value={selectedSort}
            onChange={(e) => setSelectedSort(e.target.value)}
            className="border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-700 px-4 py-2.5 bg-white focus:outline-none focus:border-rc-navy"
          >
            <option value="alphabetical">Sort Alphabetically (A-Z)</option>
            <option value="alphabeticalReverse">Sort Alphabetically (Z-A)</option>
            <option value="created">Sort by Date Added (New to Old)</option>
            <option value="createdReverse">Sort by Date Added (Old to New)</option>
          </select>
        </div>

        {/* Main Section: Filters Sidebar + Case Studies Grid */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* Left Sidebar Filters */}
          <aside className="w-full md:w-60 flex-shrink-0 space-y-6">
            
            {/* Reset Button */}
            <div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="w-full py-2.5 px-4 text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors uppercase tracking-wider"
              >
                Reset Filters
              </button>
            </div>

            {/* Find a Project */}
            <div>
              <div className="border-b border-gray-800 pb-1 mb-2">
                <h5 className="font-saira font-bold text-sm text-rc-dark">Find a Project</h5>
              </div>
              <input
                type="text"
                value={searchProject}
                onChange={(e) => setSearchProject(e.target.value)}
                placeholder="Search case studies"
                className="w-full text-xs text-gray-800 border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-rc-navy"
              />
            </div>

            {/* Project Team */}
            <div>
              <div className="border-b border-gray-800 pb-1 mb-2">
                <h5 className="font-saira font-bold text-sm text-rc-dark">Project Team</h5>
              </div>
              <input
                type="text"
                value={searchTeam}
                onChange={(e) => setSearchTeam(e.target.value)}
                placeholder="Search team members"
                className="w-full text-xs text-gray-800 border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-rc-navy"
              />
            </div>

            {/* Year Built */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection('yearbuilt')}
                className="w-full flex items-center justify-between border-b border-gray-800 pb-1 mb-3 text-left"
              >
                <h5 className="font-saira font-bold text-sm text-rc-dark">Year Built</h5>
                <span className="text-gray-500 text-xs">
                  {openSections.yearbuilt ? '▲' : '▼'}
                </span>
              </button>

              {openSections.yearbuilt && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <span className="text-[11px] text-gray-500 block mb-1">From</span>
                      <input
                        type="number"
                        min="1850"
                        max="2050"
                        value={yearFrom}
                        onChange={(e) => setYearFrom(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded text-xs p-1.5 text-gray-700"
                      />
                    </div>
                    <div className="flex-1">
                      <span className="text-[11px] text-gray-500 block mb-1">To</span>
                      <input
                        type="number"
                        min="1850"
                        max="2050"
                        value={yearTo}
                        onChange={(e) => setYearTo(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded text-xs p-1.5 text-gray-700"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dynamic Filter Categories */}
            {(Object.entries(filterGroups) as [CaseStudyFilterKey, CaseStudyFilterGroup][]).map(([groupKey, group]) => {
              const isOpen = openSections[groupKey] ?? true;
              return (
                <div key={groupKey}>
                  <button
                    type="button"
                    onClick={() => toggleSection(groupKey)}
                    className="w-full flex items-center justify-between border-b border-gray-800 pb-1 mb-3 text-left"
                  >
                    <h5 className="font-saira font-bold text-sm text-rc-dark">
                      {group.title}
                    </h5>
                    <span className="text-gray-500 text-xs">
                      {isOpen ? '▲' : '▼'}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="space-y-2 pt-1">
                      {group.options.map((opt) => {
                        const checked = selectedFilters[groupKey].includes(opt.value);
                        return (
                          <label
                            key={opt.value}
                            className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 hover:text-rc-dark select-none"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleCheckboxChange(groupKey, opt.value)}
                              className="rounded border-gray-300 text-rc-navy focus:ring-rc-navy"
                            />
                            <span>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

          </aside>

          {/* Right Grid: Case Studies Cards */}
          <main className="flex-1 w-full">
            <div className="mb-4 text-xs text-gray-500">
              Showing {filteredAndSortedStudies.length} of {studies.length} case studies
            </div>

            {studies.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-gray-300 rounded-2xl p-8">
                <p className="text-gray-500 text-base">
                  No case studies yet. They load from Supabase after the first sync (see README → Case studies).
                </p>
              </div>
            ) : filteredAndSortedStudies.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-gray-300 rounded-2xl p-8">
                <p className="text-gray-500 text-base mb-3">No case studies match your current filter criteria.</p>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-rc-navy text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors uppercase tracking-wider"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedStudies.map((study) => (
                  <div
                    key={study.id}
                    className="group flex flex-col justify-between rounded-xl overflow-hidden bg-white border border-gray-200 hover:shadow-lg transition-all duration-200"
                  >
                    <Link
                      href={study.link}
                      className="block"
                    >
                      {/* Image container */}
                      <div className="h-52 w-full overflow-hidden bg-gray-100 relative">
                        {study.image ? (
                          <img
                            src={study.image}
                            alt={study.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            No Image Available
                          </div>
                        )}
                      </div>

                      {/* Title */}
                      <div className="p-4">
                        <h3 className="font-saira font-bold text-base text-rc-dark group-hover:text-rc-red transition-colors line-clamp-2 leading-snug">
                          {study.title}
                        </h3>
                        {study.province && (
                          <span className="inline-block mt-2 text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {study.province} {study.yearBuilt ? `• Built ${study.yearBuilt}` : ''}
                          </span>
                        )}
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </main>

        </div>

      </div>
    </div>
  );
}
