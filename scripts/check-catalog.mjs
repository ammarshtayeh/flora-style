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
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));

const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: products, error } = await client
  .from("products")
  .select("id,slug,sku,name_ar,created_at,active")
  .order("created_at", { ascending: false });

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log("products:", products?.length ?? 0);
for (const row of products ?? []) {
  console.log(`- ${row.created_at} | ${row.sku} | ${row.name_ar} | active=${row.active}`);
}

const { count: imageCount } = await client.from("product_images").select("*", { count: "exact", head: true });
const { count: colorCount } = await client.from("product_colors").select("*", { count: "exact", head: true });
console.log("images:", imageCount ?? 0, "colors:", colorCount ?? 0);
