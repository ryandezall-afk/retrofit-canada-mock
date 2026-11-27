// End-to-end test of the monthly Gemini rebate scanner + Supabase rebate_programs lookup.
//   npm run test:rebates
import { NextRequest } from "next/server";
import { createPgliteFetch } from "./helpers/pglite-rest.mjs";
import { createSupabaseLikeDb } from "./helpers/supabase-like-db.mjs";
import { GET as syncRebatesRoute } from "../app/api/cron/sync-rebates/route";
import {
  getMatchingRebatesAsync,
  resetRebatesCacheForTests,
} from "../lib/rebates";
import {
  isTrustedProgramUrl,
  scanRebatesForRegion,
  syncRebatePrograms,
  type ScannedRebateProgram,
} from "../lib/retrofit-canada/rebate-sync";
import { getSupabaseAdmin, resetSupabaseClientsForTests } from "../lib/server/supabase";

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) passed++;
  else failed++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail !== undefined ? `  (${JSON.stringify(detail)})` : ""}`
  );
}

const pg = await createSupabaseLikeDb();
const supabaseFetch = createPgliteFetch(pg);

let geminiCalls = 0;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

  if (url.startsWith("http://supabase.test/")) {
    return supabaseFetch(url, init);
  }
  throw new Error(`Unexpected network call in test: ${url}`);
}) as typeof fetch;

// 1. Domain allowlist checks
check("accepts official gc.ca URL", isTrustedProgramUrl("https://natural-resources.canada.ca/test"));
check("accepts AB CEIP URL", isTrustedProgramUrl("https://ceip.abmunis.ca/"));
check("accepts Edmonton Change Homes URL", isTrustedProgramUrl("https://homes.changeforclimate.ca/"));
check("rejects http:// URL", !isTrustedProgramUrl("http://canada.ca/test"));
check("rejects contractor blog URL", !isTrustedProgramUrl("https://bob-hvac-pros.com/rebates"));

// 2. Fallback when Supabase is unconfigured
for (const k of ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY", "CRON_SECRET"]) {
  delete process.env[k];
}
resetSupabaseClientsForTests();
resetRebatesCacheForTests();

const fallbackAb = await getMatchingRebatesAsync("AB", "Yes, I'm interested");
check(
  "returns fallback rebates without Supabase",
  fallbackAb.some((r) => r.id === "ab-ceip" && r.source === "fallback")
);
check(
  "route refuses without CRON_SECRET",
  (await syncRebatesRoute(new NextRequest("http://localhost/api/cron/sync-rebates"))).status === 401
);

// 3. Configure PGlite Supabase
process.env.SUPABASE_URL = "http://supabase.test";
process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
process.env.CRON_SECRET = "test-cron-secret";
resetSupabaseClientsForTests();
resetRebatesCacheForTests();

const admin = getSupabaseAdmin()!;

// Seed a recent case_studies success to prove sync_type='case_studies' does NOT block rebates
await admin.from("sync_runs").insert({
  started_at: "2026-11-26T00:00:00Z",
  finished_at: "2026-11-26T00:01:00Z",
  status: "success",
  trigger: "cron",
  sync_type: "case_studies",
});

// 4. Test scanRebatesForRegion filters out untrusted URLs from Gemini output
let stepCount = 0;
const fakeGeminiFetch = (async () => {
  stepCount++;
  if (stepCount === 1) {
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: { parts: [{ text: "CEIP Alberta and Canada Greener Homes Loan are active." }] },
            groundingMetadata: {
              groundingChunks: [
                { web: { uri: "https://ceip.abmunis.ca/" } },
                { web: { uri: "https://spam-contractor.example.com/deals" } },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }
  return new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  programs: [
                    {
                      slug: "ab-ceip",
                      name: "CEIP Alberta",
                      level: "Municipal",
                      province: "AB",
                      summary: "Property-tax clean energy financing.",
                      estimatedValue: "Up to 100%",
                      eligibilityNotes: "Participating municipalities.",
                      eligibleUpgrades: ["Heat Pump", "Insulation"],
                      url: "https://ceip.abmunis.ca/",
                      status: "active",
                    },
                    {
                      slug: "spam-deal",
                      name: "Fake Contractor Deal",
                      level: "Utility",
                      province: "AB",
                      summary: "Untrusted site.",
                      estimatedValue: "$500",
                      eligibilityNotes: "None",
                      url: "https://spam-contractor.example.com/deals",
                      status: "active",
                    },
                  ],
                }),
              },
            ],
          },
        },
      ],
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}) as typeof fetch;

const scanned = await scanRebatesForRegion(
  { code: "AB", label: "Alberta" },
  { apiKey: "fake-key", fetchImpl: fakeGeminiFetch }
);
check("keeps trusted domain and drops untrusted domain", scanned.length === 1 && scanned[0].slug === "ab-ceip", scanned);
check(
  "sourceUrls excludes untrusted domain",
  scanned[0].sourceUrls.length === 1 && scanned[0].sourceUrls[0] === "https://ceip.abmunis.ca/"
);

// 4b. Test HTTP 429 on google_search falls back to official page fetch + standard gemini-3.5-flash
let usedModelUrl = "";
const fakeFallbackFetch = (async (input: RequestInfo | URL) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.includes("generativelanguage.googleapis.com") && !usedModelUrl) {
    usedModelUrl = url;
    return new Response(JSON.stringify({ error: { code: 429, status: "RESOURCE_EXHAUSTED" } }), {
      status: 429,
      headers: { "content-type": "application/json" },
    });
  }
  if (url.startsWith("https://ceip.abmunis.ca") || url.startsWith("https://www.calgary.ca") || url.startsWith("https://homes.changeforclimate.ca")) {
    return new Response(
      `<html><head><title>CEIP Alberta</title></head><body><main>${"Clean Energy Improvement Program property tax financing in Alberta municipalities. ".repeat(6)}</main></body></html>`,
      { status: 200, headers: { "content-type": "text/html" } }
    );
  }
  if (url.includes("generativelanguage.googleapis.com")) {
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    programs: [
                      {
                        slug: "ab-ceip",
                        name: "CEIP Alberta",
                        level: "Municipal",
                        province: "AB",
                        summary: "Property-tax clean energy financing.",
                        estimatedValue: "Up to 100%",
                        eligibilityNotes: "Participating municipalities.",
                        eligibleUpgrades: ["Heat Pump", "Insulation"],
                        url: "https://ceip.abmunis.ca/",
                        status: "active",
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }
  throw new Error(`Unexpected URL in fallback test: ${url}`);
}) as typeof fetch;

const prevGeminiModel = process.env.GEMINI_MODEL;
delete process.env.GEMINI_MODEL;
const scannedFallback = await scanRebatesForRegion(
  { code: "AB", label: "Alberta" },
  { apiKey: "fake-key", fetchImpl: fakeFallbackFetch }
);
if (prevGeminiModel !== undefined) process.env.GEMINI_MODEL = prevGeminiModel;
check("defaults to gemini-3.5-flash when GEMINI_MODEL is unset", usedModelUrl.includes("gemini-3.5-flash"), usedModelUrl);
check("429 on google_search falls back to official pages", scannedFallback.length === 1 && scannedFallback[0].slug === "ab-ceip", scannedFallback);

// 5. Sync + 30-day guard
const day1 = new Date("2026-11-01T10:00:00Z");
const samplePrograms: ScannedRebateProgram[] = [
  {
    slug: "cghl",
    name: "Canada Greener Homes Loan",
    level: "Federal",
    province: "ALL",
    summary: "0% APR loan.",
    estimatedValue: "Up to $40,000",
    eligibilityNotes: "EnerGuide audit required.",
    eligibleUpgrades: ["Heat Pump", "Insulation"],
    url: "https://natural-resources.canada.ca/loan",
    sourceUrls: ["https://natural-resources.canada.ca/loan"],
    status: "active",
  },
  {
    slug: "ab-ceip",
    name: "CEIP Alberta",
    level: "Municipal",
    province: "AB",
    summary: "Property tax financing.",
    estimatedValue: "Up to 100%",
    eligibilityNotes: "Participating municipalities.",
    eligibleUpgrades: ["Air Sealing"],
    url: "https://ceip.abmunis.ca/",
    sourceUrls: ["https://ceip.abmunis.ca/"],
    status: "active",
  },
];

const res1 = await syncRebatePrograms(admin, {
  now: day1,
  trigger: "cron",
  scanRebates: async () => {
    geminiCalls++;
    return samplePrograms;
  },
});
check("first rebate sync succeeds despite case_studies sync", res1.status === "success" && res1.inserted === 2, res1);

const resWithin30 = await syncRebatePrograms(admin, {
  now: new Date("2026-11-15T10:00:00Z"),
  trigger: "cron",
  scanRebates: async () => {
    geminiCalls++;
    return samplePrograms;
  },
});
check("skips within 30 days with zero Gemini calls", resWithin30.status === "skipped" && geminiCalls === 1, { resWithin30, geminiCalls });

// 6. Reading rebates from Supabase via reader
resetRebatesCacheForTests();
const abFromDb = await getMatchingRebatesAsync("AB");
check(
  "reads Federal + AB rebates from Supabase",
  abFromDb.length === 2 && abFromDb.every((r) => r.source === "supabase" && Boolean(r.lastVerifiedAt)),
  abFromDb
);

const bcFromDb = await getMatchingRebatesAsync("BC");
check(
  "BC only receives Federal ALL program when no BC row exists",
  bcFromDb.length === 1 && bcFromDb[0].id === "cghl",
  bcFromDb
);

// 7. 31 days later: closed/removed program deactivated
const resAfter30 = await syncRebatePrograms(admin, {
  now: new Date("2026-12-02T10:00:00Z"),
  trigger: "cron",
  scanRebates: async () => {
    geminiCalls++;
    return [samplePrograms[0]]; // ab-ceip removed
  },
});
check("31 days later deactivates removed program", resAfter30.status === "success" && resAfter30.deactivated === 1 && geminiCalls === 2, resAfter30);

resetRebatesCacheForTests();
const abAfterDeactivate = await getMatchingRebatesAsync("AB");
check("deactivated program no longer returned", abAfterDeactivate.length === 1 && abAfterDeactivate[0].id === "cghl", abAfterDeactivate);

await pg.close();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
