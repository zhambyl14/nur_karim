// Create an account without Telegram (for the store owner / testing).
//   node scripts/create-user.mjs <phone> <password> [client|admin] ["Full Name"]
// Promote an existing account:
//   node scripts/create-user.mjs <phone> --promote
import { createClient } from "@supabase/supabase-js";
import { loadEnv, normalizePhone } from "./_env.mjs";

const [, , phoneArg, passwordArg, roleArg = "client", nameArg = ""] = process.argv;
const { url, service } = loadEnv();
const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

const phone = normalizePhone(phoneArg);
if (!phone || !/^8\d{10}$/.test(phone)) {
  console.error("Usage: node scripts/create-user.mjs 87001234567 <password> [client|admin] [\"Full Name\"]");
  process.exit(1);
}

if (passwordArg === "--promote") {
  const { data, error } = await admin.from("profiles").update({ role: "admin" }).eq("phone", phone).select("id");
  if (error || !data?.length) {
    console.error("No profile with this phone", error?.message ?? "");
    process.exit(1);
  }
  console.log(`✔ ${phone} is now an admin`);
  process.exit(0);
}

if (!passwordArg || passwordArg.length < 8) {
  console.error("Password must be at least 8 characters");
  process.exit(1);
}

const { data: existing } = await admin.from("profiles").select("id").eq("phone", phone).maybeSingle();
let userId = existing?.id;
if (userId) {
  const { error } = await admin.auth.admin.updateUserById(userId, { password: passwordArg });
  if (error) throw error;
  console.log(`• ${phone} exists — password updated`);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email: `${phone}@karim.kz`,
    password: passwordArg,
    email_confirm: true,
    user_metadata: { phone, full_name: nameArg, locale: "kk" },
  });
  if (error) throw error;
  userId = data.user.id;
  console.log(`✔ created ${phone}`);
}

if (roleArg === "admin" || roleArg === "client") {
  const { error } = await admin.from("profiles").update({ role: roleArg, ...(nameArg ? { full_name: nameArg } : {}) }).eq("id", userId);
  if (error) throw error;
  console.log(`✔ role = ${roleArg}`);
}
