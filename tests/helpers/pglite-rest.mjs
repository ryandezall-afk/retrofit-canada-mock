// TEST ONLY. A small stand-in for Supabase's REST layer (PostgREST) on top of PGlite, so the real
// supabase-js client can run against real Postgres tables, constraints and grants in tests.
// It supports only what this app uses: select / insert / upsert / update / delete with
// eq, neq, lt, lte, gt, gte, like, ilike, is and in filters, order, limit, and single()/maybeSingle().
// Keys starting with "sb_secret_" act as service_role; any other key acts as anon.

const OPS = { eq: "=", neq: "<>", lt: "<", lte: "<=", gt: ">", gte: ">=" };
const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);
const ident = (name) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw Object.assign(new Error(`bad identifier ${name}`), { code: "PGRST100" });
  return `"${name}"`;
};

export function createPgliteFetch(db, { log } = {}) {
  const typeCache = new Map();
  async function columnTypes(table) {
    if (!typeCache.has(table)) {
      const { rows } = await db.query(
        `select a.attname as name, format_type(a.atttypid, a.atttypmod) as type
         from pg_attribute a where a.attrelid = $1::regclass and a.attnum > 0 and not a.attisdropped`,
        [`public.${table}`]
      );
      typeCache.set(table, Object.fromEntries(rows.map((r) => [r.name, r.type])));
    }
    return typeCache.get(table);
  }

  return async function fetch(input, init = {}) {
    const url = new URL(typeof input === "string" ? input : input.url);
    const method = (init.method ?? "GET").toUpperCase();
    const headers = new Headers(init.headers);
    const table = url.pathname.replace(/^\/rest\/v1\//, "");
    const prefer = headers.get("prefer") ?? "";
    const wantsObject = (headers.get("accept") ?? "").includes("vnd.pgrst.object");
    const role = (headers.get("apikey") ?? "").startsWith("sb_secret_") ? "service_role" : "anon";
    log?.({ method, table, query: url.search, prefer, role });

    try {
      const types = await columnTypes(table);
      const params = [];
      const p = (value, cast) => `$${params.push(value)}::${cast}`;

      const where = [];
      for (const [col, expr] of url.searchParams) {
        if (RESERVED.has(col)) continue;
        const dot = expr.indexOf(".");
        const op = expr.slice(0, dot);
        const value = expr.slice(dot + 1);
        if (op === "is") where.push(`${ident(col)} is ${{ null: "null", true: "true", false: "false" }[value]}`);
        else if (op === "in") where.push(`${ident(col)} = any(${p(value.replace(/^\(|\)$/g, "").split(","), `${types[col]}[]`)})`);
        else if (op === "ilike" || op === "like") where.push(`${ident(col)} ${op} ${p(value.replace(/\*/g, "%"), "text")}`)
        else if (OPS[op]) where.push(`${ident(col)} ${OPS[op]} ${p(value, types[col])}`);
        else throw Object.assign(new Error(`unsupported filter ${op}`), { code: "PGRST100" });
      }
      const whereSql = where.length ? ` where ${where.join(" and ")}` : "";
      const selectParam = url.searchParams.get("select");
      const selectCols = !selectParam || selectParam === "*" ? "*" : selectParam.split(",").map((c) => ident(c.trim())).join(", ");
      const order = url.searchParams.get("order");
      const orderSql = order
        ? ` order by ${order.split(",").map((o) => { const [c, d] = o.split("."); return `${ident(c)} ${d === "desc" ? "desc" : "asc"}`; }).join(", ")}`
        : "";
      const limit = url.searchParams.get("limit");
      const limitSql = limit ? ` limit ${Number.parseInt(limit, 10)}` : "";

      let sql;
      const body = init.body ? JSON.parse(init.body) : undefined;
      if (method === "GET") {
        sql = `select coalesce(json_agg(t), '[]'::json) as data from (select ${selectCols} from public.${ident(table)}${whereSql}${orderSql}${limitSql}) t`;
      } else if (method === "POST") {
        const rows = Array.isArray(body) ? body : [body];
        const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
        const colSql = cols.map(ident).join(", ");
        const conflict = url.searchParams.get("on_conflict");
        let onConflict = "";
        if (prefer.includes("resolution=merge-duplicates")) {
          const sets = cols.filter((c) => c !== conflict).map((c) => `${ident(c)} = excluded.${ident(c)}`).join(", ");
          onConflict = ` on conflict (${ident(conflict ?? "id")}) do update set ${sets}`;
        } else if (prefer.includes("resolution=ignore-duplicates")) {
          onConflict = ` on conflict do nothing`;
        }
        sql = `with w as (insert into public.${ident(table)} (${colSql})
                 select ${colSql} from jsonb_populate_recordset(null::public.${ident(table)}, ${p(JSON.stringify(rows), "jsonb")})${onConflict}
                 returning *)
               select coalesce(json_agg(t), '[]'::json) as data from (select ${selectCols} from w) t`;
      } else if (method === "PATCH") {
        const cols = Object.keys(body);
        const colSql = cols.map(ident).join(", ");
        sql = `with w as (update public.${ident(table)} set (${colSql}) = (select ${colSql} from jsonb_populate_record(null::public.${ident(table)}, ${p(JSON.stringify(body), "jsonb")}))${whereSql} returning *)
               select coalesce(json_agg(t), '[]'::json) as data from (select ${selectCols} from w) t`;
      } else if (method === "DELETE") {
        sql = `with w as (delete from public.${ident(table)}${whereSql} returning *)
               select coalesce(json_agg(t), '[]'::json) as data from (select ${selectCols} from w) t`;
      } else {
        throw Object.assign(new Error(`unsupported method ${method}`), { code: "PGRST100" });
      }

      await db.exec(`begin; set local role ${role};`);
      let data;
      try {
        ({ rows: [{ data }] } = await db.query(sql, params));
        await db.exec("commit");
      } catch (err) {
        await db.exec("rollback");
        throw err;
      }

      const json = (status, value) =>
        new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
      if (wantsObject) {
        if (data.length !== 1) {
          return json(406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `The result contains ${data.length} rows`, hint: null });
        }
        return json(method === "POST" ? 201 : 200, data[0]);
      }
      if (method !== "GET" && !prefer.includes("return=representation")) {
        return new Response(null, { status: method === "POST" ? 201 : 204 });
      }
      return json(method === "POST" ? 201 : 200, data);
    } catch (err) {
      const status = err.code === "42501" ? 401 : ["23505", "23503"].includes(err.code) ? 409 : 400;
      return new Response(
        JSON.stringify({ code: err.code ?? "XX000", message: err.message, details: err.detail ?? null, hint: null }),
        { status, headers: { "content-type": "application/json" } }
      );
    }
  };
}
