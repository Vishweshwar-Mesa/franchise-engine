// Applies db/migrations/*.sql in order, once each. Run: npm run db:migrate
// Reads DATABASE_URL from the environment (e.g. after `vercel env pull .env.local`).
import { neon } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";

for (const f of [".env.local", ".env"]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const sql = neon(url);
  await sql.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const done = new Set((await sql.query("select name from schema_migrations")).map((r) => r.name as string));
  const dir = "db/migrations";
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(file)) continue;
    const text = fs.readFileSync(path.join(dir, file), "utf8").replace(/^--.*$/gm, "");
    const statements = text.split(/;\s*$/m).map((s) => s.trim()).filter(Boolean);
    await sql.transaction([...statements.map((s) => sql.query(s)), sql.query("insert into schema_migrations (name) values ($1)", [file])]);
    console.log(`applied ${file} (${statements.length} statements)`);
  }
  console.log("migrations up to date");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
