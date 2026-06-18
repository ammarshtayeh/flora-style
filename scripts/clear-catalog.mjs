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

async function runStep(label, query) {
  const { error } = await query;
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
  console.log(`OK ${label}`);
}

async function main() {
  await runStep("order_items", client.from("order_items").delete().neq("order_id", "__none__"));
  await runStep("orders", client.from("orders").delete().neq("id", "__none__"));
  await runStep("product_images", client.from("product_images").delete().neq("product_id", "__none__"));
  await runStep("product_colors", client.from("product_colors").delete().neq("id", "__none__"));
  await runStep("products", client.from("products").delete().neq("id", "__none__"));

  const counts = await Promise.all([
    client.from("orders").select("*", { count: "exact", head: true }),
    client.from("products").select("*", { count: "exact", head: true }),
  ]);

  console.log(`Remaining orders: ${counts[0].count ?? 0}`);
  console.log(`Remaining products: ${counts[1].count ?? 0}`);
  console.log("Catalog cleanup complete.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
