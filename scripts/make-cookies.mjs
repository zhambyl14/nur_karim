// Signs in with phone + password and writes the Supabase auth cookies as a
// Playwright cookie list (for scripts/screenshot.mjs with COOKIES=<file>).
//   node scripts/make-cookies.mjs <phone> <password> <out.json>
import fs from "node:fs";
import { createServerClient } from "@supabase/ssr";
import { loadEnv, normalizePhone } from "./_env.mjs";

const [, , phoneArg, password, out = "cookies.json"] = process.argv;
const { url, anon } = loadEnv();
const jar = new Map();
const supabase = createServerClient(url, anon, {
  cookies: {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: (list) => list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
  },
});
const { error } = await supabase.auth.signInWithPassword({
  email: `${normalizePhone(phoneArg)}@karim.kz`,
  password,
});
if (error) {
  console.error("Sign-in failed:", error.message);
  process.exit(1);
}
const cookies = [...jar].map(([name, value]) => ({
  name,
  value,
  domain: "localhost",
  path: "/",
  httpOnly: false,
  secure: false,
  sameSite: "Lax",
}));
fs.writeFileSync(out, JSON.stringify(cookies, null, 2));
console.log(`✔ wrote ${cookies.length} cookie(s) to ${out}`);
