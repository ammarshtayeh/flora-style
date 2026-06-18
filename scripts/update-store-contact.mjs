import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function run() {
  const { data: current, error: readError } = await client.from("store_settings").select("*").eq("id", 1).maybeSingle();
  if (readError) throw new Error(readError.message);

  const payload = {
    id: 1,
    store_name: current?.store_name ?? "Flora Style",
    whatsapp_number: "972595405245",
    instagram_url: "https://www.instagram.com/flora_style2?igsh=MXNiamxkdzZwaDc0cA%3D%3D&utm_source=qr",
    facebook_url: current?.facebook_url ?? "",
    tiktok_url: current?.tiktok_url ?? "",
    email: current?.email ?? "",
    address_ar: current?.address_ar ?? "فلسطين",
    address_he: current?.address_he ?? "פלסטין",
  };

  const { error } = await client.from("store_settings").upsert(payload);
  if (error) throw new Error(error.message);

  console.log("Store contact settings updated.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
