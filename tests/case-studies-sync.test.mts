// End-to-end test of the case-study pipeline with no network and no Supabase project:
//   fake Retrofit Canada API -> /api/cron/sync-case-studies -> Postgres (PGlite) -> pages' data + advisor
// Supabase's REST layer is emulated by tests/helpers/pglite-rest.mjs so the real supabase-js
// client runs against the real migration, grants and RLS policy.
//   npm run test:sync
import { NextRequest } from "next/server";
import { createPgliteFetch } from "./helpers/pglite-rest.mjs";
import { createSupabaseLikeDb } from "./helpers/supabase-like-db.mjs";
import { createFakeRetrofitCanadaApi, fictionalCaseStudies } from "./fixtures/retrofit-canada-api.mjs";
import { GET as syncRoute } from "../app/api/cron/sync-case-studies/route";
import { getCaseStudyListItems, getUnifiedCaseStudyBySlug, buildFilterGroups } from "../lib/case-studies";
import { syncCaseStudies } from "../lib/retrofit-canada/sync";
import { getSupabaseAdmin, resetSupabaseClientsForTests } from "../lib/server/supabase";
import { findMatchingCaseStudies, getCachedCaseStudies } from "../lib/server/retrofit-canada-api";

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail !== undefined ? `  (${JSON.stringify(detail)})` : ""}`);
}

// --- wiring -----------------------------------------------------------------------------------
const pg = await createSupabaseLikeDb();
const supabaseFetch = createPgliteFetch(pg);
const api = { records: fictionalCaseStudies() as any[], failSlug: undefined as string | undefined, calls: 0 };
const fakeApi = createFakeRetrofitCanadaApi(api);
let supabaseDown = false;

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith("http://supabase.test/")) {
    if (supabaseDown) throw new TypeError("fetch failed");
    return supabaseFetch(url, init);
  }
  if (url.startsWith("https://portal.retrofitcanada.com/")) return fakeApi(url);
  throw new Error(`Unexpected network call in test: ${url}`);
}) as typeof fetch;

const rows = async () => (await pg.query<any>("select id, slug, name, is_active, content_hash from case_studies order by id")).rows;
const runs = async () => (await pg.query<any>("select * from sync_runs order by id")).rows;
const callRoute = (auth?: string, query = "") =>
  syncRoute(new NextRequest(`http://localhost/api/cron/sync-case-studies${query}`, { headers: auth ? { authorization: auth } : {} }));
const quietly = async <T,>(fn: () => Promise<T>) => {
  const { warn, error } = console;
  console.warn = console.error = () => {};
  try { return await fn(); } finally { console.warn = warn; console.error = error; }
};

// --- 1. Not configured ------------------------------------------------------------------------
console.log("\n--- Without Supabase settings ---");
for (const k of ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY", "CRON_SECRET"]) delete process.env[k];
resetSupabaseClientsForTests();
check("site starts with no case studies (no crash)", (await quietly(() => getCaseStudyListItems())).length === 0);
check("sync refuses to run without CRON_SECRET", (await callRoute("Bearer anything")).status === 401);

process.env.SUPABASE_URL = "http://supabase.test";
process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
process.env.CRON_SECRET = "test-cron-secret";
resetSupabaseClientsForTests();

// --- 2. First sync through the route -----------------------------------------------------------
console.log("\n--- First sync (route) ---");
check("no Authorization header -> 401", (await callRoute()).status === 401);
check("wrong secret -> 401", (await callRoute("Bearer wrong-secret")).status === 401);
check("nothing written by refused calls", (await rows()).length === 0 && (await runs()).length === 0);

const first = await quietly(() => callRoute("Bearer test-cron-secret"));
const firstBody = await first.json();
check("first sync succeeds", first.status === 200 && firstBody.status === "success", firstBody);
check("3 inserted", firstBody.inserted === 3 && firstBody.fetched === 3, firstBody);
check("API called once for the list + once per case study", api.calls === 4, api.calls);
const run1 = (await runs())[0];
check("sync_runs logged as success with counts", run1?.status === "success" && run1.inserted === 3 && run1.finished_at !== null, run1);
check("manual call logged as trigger=manual", run1?.trigger === "manual", run1?.trigger);

// --- 3. What the website reads (publishable key, through RLS) ----------------------------------
console.log("\n--- Reading (publishable key) ---");
const list = await getCaseStudyListItems();
check("list page gets 3 cards sorted by name", list.map((s) => s.title).join(" | ") ===
  "Another fictional home | Community centre feasibility study | Test bungalow goes net-zero", list.map((s) => s.title));
const bungalow = list.find((s) => s.slug === "test-bungalow")!;
const centre = list.find((s) => s.slug === "Mixed-Case-Slug")!;
check("card fields", bungalow.image.endsWith("test-9001.jpg") && bungalow.province === "AB" && bungalow.yearBuilt === 1971 && bungalow.created === "2025-02-18", bungalow);
check("team search text includes all 9 members", bungalow.team.split(" | ").length === 9, bungalow.team);
check("official dropdown value kept for filters", bungalow.filters.housetype === "Single-Family Bi-Level");
check("owner-typed value grouped as Other", centre.filters.housetype === "Other" && centre.filters.structuretype === "Other");
check("missing year built stays empty", list.find((s) => s.slug === "third-home")!.yearBuilt === null);
const groups = buildFilterGroups(list);
check("filter options come from the data, Other last", groups.housetype.options.map((o) => o.value).join() === "Row/Townhouse,Single-Family Bi-Level,Other", groups.housetype);
check("empty values don't create a filter option", groups.performancelevel.options.length === 2, groups.performancelevel);

const detail = await getUnifiedCaseStudyBySlug("test-bungalow");
const d = detail?.fullDetails;
check("detail page loads the full record", Boolean(d) && detail!.title === "Test bungalow goes net-zero");
const info = Object.fromEntries((d?.projectInfo ?? []).map((e) => [e.label, e.value]));
check("project info formats like the website", info["Location"] === "Edmonton, AB" && info["Post-Retrofit Total Floor Area"] === "193.7m²" &&
  info["Annual Energy Savings"] === "100.42%" && info["Operational Carbon Savings"] === "12.2 tCO2eq/y" && info["Heating Degree Days"] === "5120", info);
const ba = new Map((d?.beforeAndAfter ?? []).flatMap((g) => g.rows.map((r) => [`${g.section}/${r.label}`, `${r.before} -> ${r.after}`])));
check("R-values", ba.get("Envelope/Attic/Roof Assembly Effective Thermal Resistance") === "R-20.9 -> R-49.2", ba.get("Envelope/Attic/Roof Assembly Effective Thermal Resistance"));
check("missing side shows N/A", ba.get("Envelope/Air Tightness") === "4.08 ACH50 -> N/A" && ba.get("Envelope/Attic/Roof Assembly") === 'Original (7" fiberglass) -> N/A');
check("thousands separators and zero", ba.get("Annual Energy Usage/Annual Electricity Consumption") === "7,899.00 kWh -> 15,687.00 kWh" &&
  ba.get("Annual Energy Usage/Space Cooling") === "0 -> 2.82 GJ".replace("0 ->", "0 GJ ->"), [ba.get("Annual Energy Usage/Annual Electricity Consumption"), ba.get("Annual Energy Usage/Space Cooling")]);
check("negative carbon and rounding", ba.get("Carbon Emissions/Annual Operational Carbon Emissions – Electricity") === "3,459.76 KgCO2e -> -116.07 KgCO2e");
check("amps", ba.get("Mechanical & Electrical/Electrical Service") === "100 Amps -> 200 Amps");
check("empty rows are left out", !ba.has("Envelope/Wall Assembly"));
check("multi-select upgrades split into items", JSON.stringify(d?.upgrades) === JSON.stringify([
  { category: "Envelope Improvements", items: ["Attic / Roof Internal Insulation", "Foundation Walls Exterior Insulation"] },
  { category: "Electrical Improvements", items: ["Electrical Service Upgrade", "Full Electrification"] },
]), d?.upgrades);
check("priorities include goal bullets", d?.priorities.join("|") === "Increase Thermal Comfort|Other|Cut energy use in half|Keep the house livable", d?.priorities);
check("story split at Markdown headings, title not repeated", d?.sections.map((s) => s.heading).join("|") === "Project Goals|The Retrofit Story|Envelope|Lessons Learned", d?.sections.map((s) => s.heading));
const envelope = d?.sections.find((s) => s.heading === "Envelope");
check("Markdown cleaned (links, bold, bullets, --- divider)", d?.sections[1].paragraphs[0] === "Intro paragraph with a link." &&
  envelope?.paragraphs.join() === "Walls got 8 inches of cellulose." && envelope?.bullets.join() === "Attic topped up,New windows", envelope);
check("intro without Markdown", d?.intro === "A fictional retrofit by Example Builders, under budget.");
check("documents link to the portal download", d?.documents[0]?.url === "https://portal.retrofitcanada.com/downloadFile/508/Pre%20Retrofit%20Audit.pdf", d?.documents);
check("photos grouped by phase, empty phases left out", d?.photos.map((p) => `${p.phase}:${p.items.length}`).join() === "Pre Retrofit:1,Post Retrofit:2", d?.photos);
check("drawings", d?.drawings[0]?.caption === "Wall section");
check("metrics for the advisor", detail?.metrics.beforeGj === 225.27 && detail?.metrics.afterGj === 56.47 && detail?.metrics.energyReductionPercent === 100.42, detail?.metrics);
check("slug lookup ignores letter case", (await getUnifiedCaseStudyBySlug("mixed-case-slug"))?.id === 102);
const centreDetail = await getUnifiedCaseStudyBySlug("Mixed-Case-Slug");
check("owner-typed house type shown as typed on the detail page", centreDetail?.houseType === "Part 3");
check("parent heading kept, bold line stays a paragraph", centreDetail?.fullDetails?.sections.map((s) => s.heading).join("|") === "The Retrofit Story|Existing Building Details" &&
  centreDetail?.fullDetails?.sections[1].paragraphs.join("|") === "Overview|A one-storey building.", centreDetail?.fullDetails?.sections);
check("unknown slug -> not found", (await getUnifiedCaseStudyBySlug("does-not-exist")) === undefined);

// --- 4. The daily cron within 30 days ---------------------------------------------------------
console.log("\n--- Daily cron within 30 days ---");
api.calls = 0;
const second = await (await callRoute("Bearer test-cron-secret")).json();
check("skipped: last sync < 30 days ago", second.status === "skipped" && Boolean(second.nextDueAt), second);
check("Retrofit Canada not called", api.calls === 0, api.calls);
const forced = await quietly(async () => (await callRoute("Bearer test-cron-secret", "?force=1")).json());
check("?force=1 syncs anyway; nothing changed", forced.status === "success" && forced.unchanged === 3 && forced.updated === 0, forced);

// --- 5. A month later: changes, additions, removals --------------------------------------------
console.log("\n--- 31 days later ---");
const db = getSupabaseAdmin()!;
const later = new Date(Date.now() + 31 * 24 * 3600 * 1000);
api.records = fictionalCaseStudies().filter((r) => r.id !== 103);
api.records.find((r) => r.id === 102)!.caseStudyName = "Community centre feasibility study (updated)";
api.records.push({ ...fictionalCaseStudies()[2], id: 104, urlSlug: "brand-new-home", caseStudyName: "Brand new home" });
const month2 = await syncCaseStudies(db, { now: later });
check("counts: 1 new, 1 changed, 1 unchanged, 1 removed", month2.status === "success" &&
  month2.inserted === 1 && month2.updated === 1 && month2.unchanged === 1 && month2.deactivated === 1, month2);
const after = await rows();
check("removed case study kept but unpublished", after.find((r) => r.id === 103)?.is_active === false);
check("website no longer lists it", !(await getCaseStudyListItems()).some((s) => s.slug === "third-home"));
check("its page is gone", (await getUnifiedCaseStudyBySlug("third-home")) === undefined);
check("changed name saved", after.find((r) => r.id === 102)?.name === "Community centre feasibility study (updated)");

// --- 6. Failures never leave half-updated data -------------------------------------------------
console.log("\n--- Failures ---");
const before = JSON.stringify(await rows());
const evenLater = new Date(later.getTime() + 31 * 24 * 3600 * 1000);
api.failSlug = "test-bungalow";
api.records.find((r) => r.id === 104)!.caseStudyName = "Should not be saved";
const broken = await syncCaseStudies(db, { now: evenLater });
check("one case study failing (after a retry) fails the whole sync", broken.status === "failed" && /500/.test((broken as any).message), broken);
check("table unchanged", JSON.stringify(await rows()) === before);
const failedRun = (await runs()).at(-1);
check("failed run logged with the error", failedRun?.status === "failed" && /500/.test(failedRun.error), failedRun);
api.failSlug = undefined;

const allRecords = api.records;
api.records = allRecords.slice(0, 1);
const tooFew = await syncCaseStudies(db, { now: evenLater });
check("API suddenly missing most case studies -> refused", tooFew.status === "failed" && /looks like an API problem/.test((tooFew as any).message), tooFew);
api.records = [];
const empty = await syncCaseStudies(db, { now: evenLater });
check("API returning nothing -> refused", empty.status === "failed");
check("still nothing unpublished by mistake", JSON.stringify(await rows()) === before);
api.records = allRecords;
const recovered = await syncCaseStudies(db, { now: evenLater });
check("next day's retry succeeds (failed runs don't reset the 30 days)", recovered.status === "success", recovered);

await pg.query("update sync_runs set status = 'running', finished_at = null where id = (select max(id) from sync_runs)");
const overlap = await syncCaseStudies(db, { now: new Date(evenLater.getTime() + 60_000), force: true });
check("a sync already running -> skipped", overlap.status === "skipped" && /already running/.test((overlap as any).reason), overlap);
const stale = await syncCaseStudies(db, { now: new Date(evenLater.getTime() + 20 * 60_000), force: true });
check("a 'running' row older than 15 min is ignored", stale.status === "success", stale);

// --- 7. The advisor ----------------------------------------------------------------------------
console.log("\n--- Advisor ---");
const { matches, cacheMeta } = await findMatchingCaseStudies({ postalCode: "T5K 0A1", yearBuilt: "1970–1989" } as any, 4);
check("advisor matches come from Supabase", matches.length === 3 && matches.every((m) => m.source === "retrofit_canada_api"), matches.map((m) => m.title));
check("best match is the Alberta 1971 home", matches[0]?.title === "Test bungalow goes net-zero", matches[0]);
check("cache meta names the source", cacheMeta.provider === "retrofit_canada_supabase" && cacheMeta.totalRecordsAvailable === 3, cacheMeta);
supabaseDown = true;
const fallback = await quietly(() => getCachedCaseStudies({ forceRefresh: true }));
check("Supabase down -> advisor keeps the last list", fallback.records.length === 3);
let threw = false;
await getCaseStudyListItems().catch(() => (threw = true));
check("Supabase down -> pages throw, so Next.js keeps the last good page", threw);
supabaseDown = false;

console.log(`\n${passed} passed, ${failed} failed`);
await pg.close();
process.exit(failed ? 1 : 0);
