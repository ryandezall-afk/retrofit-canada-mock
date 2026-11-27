// Runs the Supabase migration on PGlite and checks the security and data rules the app relies on.
// No Supabase project, Docker or keys needed.   npm run test:db
import { createSupabaseLikeDb } from "../helpers/supabase-like-db.mjs";

let passed = 0;
let failed = 0;
function check(name, ok, detail = "") {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  (${detail})` : ""}`);
}

/** Runs `sql` as `role` inside a transaction that is always rolled back. */
async function as(db, role, sql, params = []) {
  await db.exec(`begin; set local role ${role};`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("rollback");
  }
}
async function allowed(db, role, name, sql, params) {
  try {
    const result = await as(db, role, sql, params);
    check(name, true);
    return result;
  } catch (err) {
    check(name, false, err.message);
  }
}
async function denied(db, role, name, sql, params) {
  try {
    await as(db, role, sql, params);
    check(name, false, "statement was accepted");
  } catch {
    check(name, true);
  }
}

const insertStudy = (id, slug, active = true) => `
  insert into public.case_studies (id, slug, name, raw, content_hash, is_active)
  values (${id}, '${slug}', 'Case ${id}', '{"id": ${id}}', 'hash-${id}', ${active})`;

async function runChecks(autoExpose) {
  console.log(`\n--- "Automatically expose new tables" ${autoExpose ? "ON (projects before 30 May 2026)" : "OFF (new projects)"} ---`);
  const db = await createSupabaseLikeDb({ autoExpose });
  check("migration applies cleanly", true);

  // Seed as the table owner: one published and one unpublished case study.
  await db.exec(`${insertStudy(1, "published-home")}; ${insertStudy(2, "removed-home", false)};`);

  // The website's publishable key (anon) ------------------------------------------------------
  const visible = await allowed(db, "anon", "anon can read case_studies", "select slug from public.case_studies");
  check("anon sees only published case studies", visible?.rows.map((r) => r.slug).join() === "published-home");
  await denied(db, "anon", "anon cannot insert case studies", insertStudy(3, "x"));
  await denied(db, "anon", "anon cannot update case studies", "update public.case_studies set name = 'hacked'");
  await denied(db, "anon", "anon cannot delete case studies", "delete from public.case_studies");
  await denied(db, "anon", "anon cannot read sync_runs", "select * from public.sync_runs");
  await denied(db, "anon", "anon cannot write sync_runs", "insert into public.sync_runs default values");
  await denied(db, "authenticated", "logged-in users cannot write case studies", insertStudy(4, "y"));
  const authRead = await allowed(db, "authenticated", "logged-in users can read case_studies", "select slug from public.case_studies");
  check("logged-in users see only published ones too", authRead?.rows.length === 1);

  // The sync's secret key (service_role) -------------------------------------------------------
  await allowed(db, "service_role", "service_role can insert case studies", insertStudy(5, "new-home"));
  await allowed(
    db, "service_role", "service_role can upsert case studies",
    `insert into public.case_studies (id, slug, name, raw, content_hash) values (1, 'published-home', 'Renamed', '{}', 'h2')
     on conflict (id) do update set name = excluded.name, content_hash = excluded.content_hash`
  );
  await allowed(db, "service_role", "service_role can unpublish case studies", "update public.case_studies set is_active = false where id = 1");
  const all = await allowed(db, "service_role", "service_role reads unpublished ones too", "select count(*)::int as n from public.case_studies");
  check("service_role sees both rows", all?.rows[0].n === 2);
  await allowed(db, "service_role", "service_role can log a sync run (identity sequence)", "insert into public.sync_runs (status) values ('running') returning id");
  await allowed(db, "service_role", "service_role can read sync_runs", "select * from public.sync_runs");

  // Data rules ---------------------------------------------------------------------------------
  await denied(db, "service_role", "slug must be unique", insertStudy(6, "published-home"));
  await denied(db, "service_role", "raw is required", "insert into public.case_studies (id, slug, name, content_hash) values (7, 'z', 'Z', 'h')");
  await denied(db, "service_role", "sync status must be running/success/failed", "insert into public.sync_runs (status) values ('done')");
  await denied(db, "service_role", "sync trigger must be cron/manual", "insert into public.sync_runs (trigger) values ('robot')");
  const defaults = await allowed(db, "service_role", "service_role insert returns defaults", `${insertStudy(8, "defaults")} returning is_active, team, first_synced_at is not null as has_time`);
  const row = defaults?.rows[0];
  check("new case studies default to published, empty team, timestamps set",
    row?.is_active === true && JSON.stringify(row?.team) === "[]" && row?.has_time === true);

  const rls = await db.query(`select relname, relrowsecurity from pg_class where relname in ('case_studies', 'sync_runs') order by relname`);
  check("RLS is on for both tables", rls.rows.every((r) => r.relrowsecurity) && rls.rows.length === 2);
  await db.close();
}

await runChecks(false);
await runChecks(true);
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
