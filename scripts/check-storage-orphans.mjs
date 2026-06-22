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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const { data: files, error } = await client.storage.from("flora-assets").list("products", { limit: 200, sortBy: { column: "created_at", order: "desc" } });

if (error) {
  console.error("storage error:", error.message);
  process.exit(1);
}

console.log("product images in storage:", files?.length ?? 0);
for (const file of files ?? []) {
  console.log(`- ${file.created_at} | ${file.name}`);
}

const { data: images } = await client.from("product_images").select("image_url");
const linked = new Set((images ?? []).map((row) => row.image_url.split("/").pop()));
const orphaned = (files ?? []).filter((f) => !linked.has(f.name));
console.log("orphaned files (not linked to DB):", orphaned.length);
console.log(`\nBucket: flora-assets / folder: products`);
console.log(`Dashboard: ${supabaseUrl?.replace(".supabase.co", "")} → Storage → flora-assets → products\n`);
for (const file of orphaned) {
  const path = `products/${file.name}`;
  const { data } = client.storage.from("flora-assets").getPublicUrl(path);
  console.log(`${file.created_at}`);
  console.log(data.publicUrl);
  console.log("");
}
