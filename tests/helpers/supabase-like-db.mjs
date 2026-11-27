// TEST ONLY. A fresh Postgres (PGlite: real Postgres compiled to WebAssembly) set up the way
// Supabase sets up a project, with every migration in supabase/migrations applied.
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migrationsDir = new URL("../../supabase/migrations/", import.meta.url);

/**
 * autoExpose = false: projects created since 30 May 2026 ("Automatically expose new tables" off):
 *   new tables get NO Data API privileges, so the migration must grant them itself.
 * autoExpose = true: older projects, where every new table is granted to all API roles.
 */
export async function createSupabaseLikeDb({ autoExpose = false } = {}) {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
  `);
  if (autoExpose) {
    await db.exec(`
      alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
      alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    `);
  } else {
    await db.exec(`
      alter default privileges in schema public grant truncate, references, trigger on tables to anon, authenticated, service_role;
      alter default privileges in schema public grant update on sequences to anon, authenticated, service_role;
    `);
  }
  for (const file of (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(await readFile(new URL(file, migrationsDir), "utf8"));
  }
  return db;
}
