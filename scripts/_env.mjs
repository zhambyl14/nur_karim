// Loads .env.local for standalone node scripts.
import fs from "node:fs";
import path from "node:path";

export function loadEnv() {
  const file = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) throw new Error("Missing Supabase env vars in .env.local");
  return { url, anon, service };
}

export function normalizePhone(input) {
  const d = String(input ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (/^7\d{10}$/.test(d)) return `8${d.slice(1)}`;
  if (/^8\d{10}$/.test(d)) return d;
  if (/^7\d{9}$/.test(d)) return `8${d}`;
  return d;
}
