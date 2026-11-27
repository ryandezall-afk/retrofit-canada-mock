// Runs the case-study sync now: Retrofit Canada API -> Supabase.
//
//   npm run sync:case-studies                 (your local app; start `npm run dev` first)
//   npm run sync:case-studies -- https://your-app.vercel.app
//
// It calls /api/cron/sync-case-studies?force=1 with CRON_SECRET from .env.local, so it downloads
// even if the last sync was less than 30 days ago.

const target = (process.argv[2] ?? "http://localhost:3000").replace(/\/+$/, "");
const secret = process.env.CRON_SECRET?.trim();

if (!secret) {
  console.error("CRON_SECRET is missing. Add it to .env.local (see .env.example).");
  process.exit(1);
}

const url = `${target}/api/cron/sync-case-studies?force=1`;
console.log(`Syncing case studies via ${url} ... (about 15-30 seconds)`);

try {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${secret}` } });
  const body = await res.json().catch(() => ({}));
  if (res.ok && body.status === "success") {
    console.log(
      `Done: ${body.fetched} case studies from the API ` +
        `(${body.inserted} new, ${body.updated} changed, ${body.unchanged} unchanged, ${body.deactivated} removed).`
    );
  } else if (res.status === 401) {
    console.error("401 Unauthorized: CRON_SECRET in .env.local doesn't match the one the app is using.");
    process.exitCode = 1;
  } else {
    console.error(`Sync did not succeed (HTTP ${res.status}):`, body);
    process.exitCode = 1;
  }
} catch (err) {
  console.error(`Could not reach ${target}. Is the app running (npm run dev)?`, err.message);
  process.exitCode = 1;
}
