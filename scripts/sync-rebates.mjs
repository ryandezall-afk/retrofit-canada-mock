// Runs the monthly Gemini rebate scan now: Gemini Search Grounding -> Supabase rebate_programs.
//
//   npm run sync:rebates                 (your local app; start `npm run dev` first)
//   npm run sync:rebates -- https://your-app.vercel.app

const target = (process.argv[2] ?? "http://localhost:3000").replace(/\/+$/, "");
const secret = process.env.CRON_SECRET?.trim();

if (!secret) {
  console.error("CRON_SECRET is missing. Add it to .env.local (see .env.example).");
  process.exit(1);
}

const url = `${target}/api/cron/sync-rebates?force=1`;
console.log(`Syncing rebates via ${url} ... (about 15-40 seconds)`);

try {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${secret}` } });
  const body = await res.json().catch(() => ({}));
  if (res.ok && body.status === "success") {
    console.log(
      `Done: ${body.fetched} rebate programs scanned ` +
        `(${body.inserted} new, ${body.updated} changed, ${body.unchanged} unchanged, ${body.deactivated} closed).`
    );
  } else if (res.status === 401) {
    console.error("401 Unauthorized: CRON_SECRET in .env.local doesn't match the app.");
    process.exitCode = 1;
  } else {
    console.error(`Rebate sync did not succeed (HTTP ${res.status}):`, body);
    process.exitCode = 1;
  }
} catch (err) {
  console.error(`Could not reach ${target}. Is the app running (npm run dev)?`, err.message);
  process.exitCode = 1;
}
