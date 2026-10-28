import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="w-full">
      {/* 1. Hero Cover Section with exact banner image and dark overlay */}
      <div className="relative min-h-[500px] w-full overflow-hidden flex items-center">
        {/* Banner image */}
        <img
          src="https://retrofitcanada.com/wp-content/uploads/2025/02/retrofit-canada-home-banner-1024x410-copy.webp"
          alt="Retrofit Canada Home Banner"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Secondary dark navy dim overlay (has-background-dim-80) */}
        <div className="absolute inset-0 bg-[#2e3249] opacity-80" />

        {/* Content container */}
        <div className="relative z-10 max-w-[1240px] mx-auto px-6 lg:px-12 py-16 w-full text-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            {/* Left column */}
            <div>
              <h1 className="font-saira text-4xl sm:text-5xl lg:text-[54px] font-bold text-white leading-[1.15] tracking-tight">
                Deep Retrofits. Making existing homes net-zero.
              </h1>
            </div>

            {/* Right column */}
            <div className="space-y-4 font-roboto text-base sm:text-lg text-white font-normal leading-relaxed">
              <p>
                About 1/3 of greenhouse gases come from the buildings we use right now. 70 per cent will still be standing in 2050.
              </p>
              <p>
                We can’t address climate change just by building new net-zero homes. We need solutions that make the homes we live in right now net-zero to preserve a livable climate. Deep Retrofits are the solution.
              </p>


              {/* Retrofit AI call-to-action */}
              <div className="border-t border-white/25 pt-6 space-y-4">
                <p className="font-saira text-xl sm:text-2xl font-semibold text-white leading-snug">
                  Get your personalized retrofit assessment now?
                </p>
                <Link
                  href="/retrofit-ai"
                  className="group inline-flex items-center gap-2 bg-[#faa627] hover:bg-white text-[#2e3249] font-roboto font-bold text-sm sm:text-base px-7 py-3 rounded-[10px] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2e3249]"
                >
                  Start my assessment
                  <ArrowRight
                    aria-hidden="true"
                    className="w-4 h-4 transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="h-10" />

      {/* 2. Featured Case Studies Section */}
      <div className="max-w-[1240px] mx-auto px-6 lg:px-12 space-y-6">
        <h3 className="font-saira text-2xl sm:text-3xl font-bold text-[#2e3249]">
          Featured Case Studies
        </h3>

        {/* Case Studies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Woodbine */}
          <div className="space-y-3">
            <Link href="/case-studies/woodbine" className="group block">
              <div className="overflow-hidden rounded-md bg-slate-100 h-64 sm:h-72">
                <img
                  src="https://portal.retrofitcanada.com/storage/caseStudy/26/images/file_6759b7ddc240e.jpeg"
                  alt="Woodbine"
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h3 className="font-saira font-bold text-xl sm:text-2xl text-[#2e3249] mt-3 group-hover:text-[#faa627] transition-colors">
                Woodbine
              </h3>
            </Link>
            <p className="font-roboto text-sm sm:text-base text-slate-700 leading-relaxed">
              This net-zero deep retrofit of a Calgary single-family home made the building so energy-efficient it can get all of its energy needs from solar.
            </p>
          </div>

          {/* Card 2: '71 bungalow goes net-zero with a hat, a coat and a boot */}
          <div className="space-y-3">
            <Link href="/case-studies/hat-coat-boot" className="group block">
              <div className="overflow-hidden rounded-md bg-slate-100 h-64 sm:h-72">
                <img
                  src="https://portal.retrofitcanada.com/storage/caseStudy/47/images/cqnAG69MbeXaHF6sXqFh3sDGwOAfTerQ8Dd0bNWe.jpg"
                  alt="'71 bungalow goes net-zero with a hat, a coat and a boot"
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h3 className="font-saira font-bold text-xl sm:text-2xl text-[#2e3249] mt-3 group-hover:text-[#faa627] transition-colors">
                &apos;71 bungalow goes net-zero with a hat, a coat and a boot
              </h3>
            </Link>
            <p className="font-roboto text-sm sm:text-base text-slate-700 leading-relaxed">
              This deep energy retrofit used “a hat, a coat, and a boot” approach, improving insulation, airtightness, and efficiency to create a net-zero home for under $150,000.
            </p>
          </div>
        </div>

        {/* View more Case Studies Button */}
        <div className="pt-6 pb-2 text-center">
          <Link
            href="/case-studies"
            className="inline-block bg-[#2e3249] hover:bg-[#1f2233] text-white font-roboto font-medium text-sm sm:text-base px-8 py-3 rounded-[10px] transition-colors shadow-sm"
          >
            View more Case Studies
          </Link>
        </div>
      </div>

      {/* Spacer */}
      <div className="h-12" />

      {/* 3. News Section */}
      <div className="max-w-[1240px] mx-auto px-6 lg:px-12 pb-16 space-y-6">
        <h3 className="font-saira text-2xl sm:text-3xl font-bold text-[#2e3249]">
          News
        </h3>

        {/* 3 Columns News Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Post 1 */}
          <div className="bg-[#2e3249] text-white p-6 rounded-md flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="text-xs text-slate-300 font-roboto">
                October 28, 2025
              </div>
              <h2 className="font-saira font-bold text-xl sm:text-2xl text-white leading-snug">
                <Link
                  href="/news"
                  className="hover:text-[#faa627] transition-colors"
                >
                  Join Retrofit Canada’s Board of Directors
                </Link>
              </h2>
              <p className="font-roboto text-xs sm:text-sm text-slate-200 leading-relaxed">
                **Update: We are no longer accepting applications** Retrofit Canada is looking for a governance, financial, or policy/regulatory professional to join our volunteer Board of Directors. This role offers a chance to help a national deep-retrofit non-profit share solutions, eliminate barriers, and accelerate deep retrofits in Canada. Familiarity with deep retrofits or energy efficiency is an…
              </p>
            </div>
            <div>
              <Link
                href="/news"
                className="text-xs font-bold text-white uppercase hover:text-[#faa627] tracking-wider transition-colors inline-block pt-2"
              >
                Read More
              </Link>
            </div>
          </div>

          {/* Post 2 */}
          <div className="bg-[#2e3249] text-white p-6 rounded-md flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="text-xs text-slate-300 font-roboto">
                July 21, 2025
              </div>
              <h2 className="font-saira font-bold text-xl sm:text-2xl text-white leading-snug">
                <Link
                  href="/news"
                  className="hover:text-[#faa627] transition-colors"
                >
                  Completed a deep retrofit? Submit your project to us
                </Link>
              </h2>
              <p className="font-roboto text-xs sm:text-sm text-slate-200 leading-relaxed">
                Retrofit Canada is on a mission to gather deep retrofit case studies from across the country. We want to make it easier for Canadians to retrofit their homes and buildings with practical, cost-effective upgrades that cut emissions and improve comfort, durability, and efficiency. Deep Retrofits, sometimes called deep energy retrofits, are often complex and costly.…
              </p>
            </div>
            <div>
              <Link
                href="/news"
                className="text-xs font-bold text-white uppercase hover:text-[#faa627] tracking-wider transition-colors inline-block pt-2"
              >
                Read More
              </Link>
            </div>
          </div>

          {/* Post 3 */}
          <div className="bg-[#2e3249] text-white p-6 rounded-md flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="text-xs text-slate-300 font-roboto">
                February 21, 2025
              </div>
              <h2 className="font-saira font-bold text-xl sm:text-2xl text-white leading-snug">
                <Link
                  href="/news"
                  className="hover:text-[#faa627] transition-colors"
                >
                  Retrofit Canada’s Case Study Library Just Got Better
                </Link>
              </h2>
              <p className="font-roboto text-xs sm:text-sm text-slate-200 leading-relaxed">
                Since 2019, Retrofit Canada has been building a case study library to support deep retrofit professionals with real-world examples, technical insights, and lessons learned from completed projects. Over the past five years, our library has grown to include over 25 residential deep retrofit case studies. Now, with support from NRCan’s Greener Neighbourhoods Pilot Program, and in collaboration with…
              </p>
            </div>
            <div>
              <Link
                href="/news"
                className="text-xs font-bold text-white uppercase hover:text-[#faa627] tracking-wider transition-colors inline-block pt-2"
              >
                Read More
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
