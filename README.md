# Retrofit Canada Web Platform (Exact Clone)

A high-fidelity, complete web clone of **[Retrofit Canada](https://retrofitcanada.com/)**, built from the ground up as a modern **Next.js (App Router)** project in **TypeScript** and **Tailwind CSS**.

---

## 🏗️ Architecture & School Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | **Next.js (App Router)** | Static site generation (SSG) with file-based routing |
| **Language** | **TypeScript** | Strict type definitions (`types/index.ts`) for data modeling |
| **Styling** | **Tailwind CSS** | Responsive styling aligned with Retrofit Canada branding |
| **Icons** | **Lucide React** | Clean, accessible SVG iconography |
| **Components** | **React 18** | Modular client & server components |

---

## 📁 Project Directory Structure

```
capstone/
├── app/
│   ├── layout.tsx                     # Global Root Layout (Navbar & Footer wrapper)
│   ├── page.tsx                       # Homepage (Hero, Roadmap preview, Featured Case Studies)
│   ├── case-studies/
│   │   ├── page.tsx                   # Case Study Library (loads from Supabase; UI in components/CaseStudiesBrowser.tsx)
│   │   └── [id]/
│   │       └── page.tsx               # Dynamic individual case study breakdown with HOT2000 specs
│   ├── the-retrofit-roadmap/
│   │   └── page.tsx                   # The Retrofit Roadmap 6-step phased implementation guide
│   ├── learn/
│   │   └── page.tsx                   # Deep Retrofits 101 educational hub & FAQs
│   ├── news/
│   │   └── page.tsx                   # News & policy articles
│   ├── events/
│   │   └── page.tsx                   # Conferences, technical webinars & workshops
│   ├── about/
│   │   └── page.tsx                   # About us, 2050 decarbonization challenge, leadership & partners
│   ├── contact/
│   │   └── page.tsx                   # Contact form & API research access request
│   ├── submit-project/
│   │   └── page.tsx                   # Intake form for contractors, advisors, and owners
│   ├── api/cron/sync-case-studies/
│   │   └── route.ts                   # Monthly sync: Retrofit Canada API -> Supabase (called by Vercel Cron)
│   └── globals.css                    # Tailwind CSS directives
├── lib/
│   ├── case-studies.ts                # Reads case studies from Supabase (cached, server only)
│   ├── retrofit-canada/               # API client, mapper (API record -> page data), sync, dropdown options
│   └── server/supabase.ts             # Supabase clients (publishable key = read, secret key = sync)
├── supabase/migrations/               # SQL to create the case_studies and sync_runs tables
├── tests/                             # npm test: database rules + full sync pipeline (no keys needed)
├── components/
│   ├── Navbar.tsx                     # Top header matching Retrofit Canada navigation
│   ├── Footer.tsx                     # Comprehensive footer with NRCan, SAIT, SSRIA & CEIP partners
│   └── CaseStudyCard.tsx              # Card component with before/after GJ metrics & tags
├── data/
│   ├── case-studies.ts                # Real Canadian deep retrofit projects (Calgary, Edmonton, BC, ON)
│   ├── roadmap.ts                     # Detailed 6-step Retrofit Roadmap data
│   ├── news.ts                        # Articles & policy reports
│   └── events.ts                      # Conferences & workshops
├── types/
│   └── index.ts                       # TypeScript interfaces for all data entities
├── tailwind.config.js                 # Tailwind design tokens
├── tsconfig.json                      # Next.js TypeScript compiler options with `@/*` aliases
├── package.json                       # Dependencies & scripts (`dev`, `build`, `start`, `lint`)
└── README.md                          # Project documentation
```

---

## 🌐 Pages & Features Included

1. **Homepage (`/`)**:
   - Hero banner: *"Accelerating Deep Retrofits Across Canada"*, 2050 building decarbonization mission.
   - What is a Deep Energy Retrofit? (Piecemeal swaps vs. Whole-building approach).
   - Featured Case Studies grid.
   - The Retrofit Roadmap 4-step preview.
   - Partner strip: Natural Resources Canada (NRCan GNPP), SAIT Applied Research, SSRIA, Sundance Housing Co-op, Alberta Ecotrust.

2. **Case Study Library (`/case-studies`)**:
   - Search bar across cities, contractors, and building types.
   - Live filters by Province (AB, BC, ON, NS), Building Type (Bungalow, Split-level, Townhome, Heritage), Retrofit Type (Envelope & Mechanical, Panelization, Mechanical), and Performance Level (Net-Zero, Net-Zero Ready).
   - Empirical stats on each card: Baseline GJ/yr vs. Post-Retrofit GJ/yr, airtightness (ACH@50), and % energy reduction.

3. **Single Case Study Detail View (`/case-studies/[id]`)**:
   - Statically generated routes for all 8 Canadian case studies.
   - Empirical metrics: Energy consumption pre vs. post, airtightness pre vs. post, financial breakdown (gross cost, grants, net cost), annual utility savings.
   - Technical specifications: Attic RSI, Wall RSI, Foundation, Windows, Space Heating, Backup Heating, DHW, and Solar PV.
   - Project narrative & key lessons learned from practitioners.

4. **The Retrofit Roadmap (`/the-retrofit-roadmap`)**:
   - Step 1: Get a Ballpark Estimate
   - Step 2: Choose a Project Team
   - Step 3: Conduct Energy Audit & Baseline Modeling
   - Step 4: Envelope First Sequencing
   - Step 5: Electrify & Clean Mechanicals
   - Step 6: On-Site Renewables & Verification
   - Interactive expandable cards with action items, tips for success, and common pitfalls.

5. **Learn / Deep Retrofits 101 (`/learn`)**:
   - The 4 pillars: Airtightness & Stack Effect, Cold-Climate Heat Pumps (-30°C), Thermal Bridging & Continuous Insulation, and Economics & Financing.
   - Interactive FAQs accordion.

6. **News (`/news`)**:
   - National research announcements, policy shifts, and database updates.

7. **Events (`/events`)**:
   - Annual Retrofit Canada Conference, technical sizing webinars, and contractor workshops.

8. **About Us (`/about`)**:
   - Mission statement and Canada's 2050 building stock challenge.
   - Leadership & founders: Dr. Rebecca Pinto, P.Eng. (Executive Director) and Peter Amerongen (Co-Founder).
   - Founding partners and applied research supporters.

9. **Contact & Submit Project (`/contact`, `/submit-project`)**:
   - General communication, media requests, and API / research credentials.
   - Detailed project submission form for building owners and energy advisors.

---

## 🗄️ Case studies: Retrofit Canada API → Supabase → this site

Case studies are **not** stored in the repo. They come from Retrofit Canada's public API
(`https://portal.retrofitcanada.com/api/v1`, Swagger at `/api/documentation`, no key needed):

```
Vercel Cron (daily) ──> /api/cron/sync-case-studies ──> Retrofit Canada API (only if last sync ≥ 30 days ago)
                                                   └──> Supabase table case_studies
Website pages + AI advisor ──> Supabase (publishable key, read-only) ──> cached by Next.js for a day
```

- The sync downloads the list (`GET /caseStudies`) and then every case study in full
  (`GET /caseStudies/lookup/{slug}`), because the list leaves out most fields.
- New case studies are added, changed ones updated, and ones the API stops listing are hidden
  (`is_active = false`), not deleted. Each run is logged in `sync_runs`.
- If any download fails, nothing is changed and the next day's cron tries again.
- `raw` keeps each record exactly as the API sent it; the detail page is built from it by
  `lib/retrofit-canada/mapper.ts`, using the same labels and number formats as retrofitcanada.com.

### One-time setup

1. **Supabase**: create a project (region Canada (Central)). In **SQL Editor → New query**, paste
   `supabase/migrations/20261127130000_case_studies.sql` and click **Run**.
2. **Keys**: copy `.env.example` to `.env.local` and fill in `SUPABASE_URL`,
   `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (Project Settings → API Keys) and a
   `CRON_SECRET` you make up. **Never commit `.env.local` or share the secret key.**
3. **Vercel**: add the same four variables in Project → Settings → Environment Variables, then redeploy.
4. **First fill**: Vercel → Project → Settings → Cron Jobs → **Run** (or locally: `npm run dev`,
   then in a second terminal `npm run sync:case-studies`). Supabase now has every case study.

After that it runs by itself. To refresh early: `npm run sync:case-studies` (local) or
`npm run sync:case-studies -- https://<your-app>.vercel.app`.

### Tests (no keys or network needed)

```bash
npm test   # database security rules on real Postgres (PGlite) + the whole sync pipeline with a fake API
```

---

## 🚀 How to Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev

# 3. Open in your browser
http://localhost:3000

# 4. Production build
npm run build
npm run start
```
