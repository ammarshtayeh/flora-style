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

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0590-\u05ff\u0600-\u06ff]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildProductSlug(product) {
  const manual = product.slug?.trim();
  if (manual) {
    const fromManual = slugify(manual);
    if (fromManual) return fromManual;
  }

  const fromSku = product.sku?.trim();
  if (fromSku) {
    const skuSlug = slugify(fromSku);
    if (skuSlug) return skuSlug;
  }

  const fromHebrew = product.name_he?.trim();
  if (fromHebrew) {
    const heSlug = slugify(fromHebrew);
    if (heSlug) return heSlug;
  }

  const fromArabic = product.name_ar?.trim();
  if (fromArabic) {
    const arSlug = slugify(fromArabic);
    if (arSlug) return arSlug;
  }

  const idSuffix = product.id.replace(/^prod-?/i, "").slice(-12) || Date.now().toString(36);
  return `product-${idSuffix}`;
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

async function resolveUniqueProductSlug(product, usedSlugs) {
  const baseSlug = buildProductSlug(product);
  let candidate = baseSlug;
  let suffix = 2;

  while (usedSlugs.has(candidate) && usedSlugs.get(candidate) !== product.id) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  usedSlugs.set(candidate, product.id);
  return candidate;
}

async function run() {
  const { data: products, error } = await client
    .from("products")
    .select("id,slug,sku,name_ar,name_he")
    .order("created_at");

  if (error) {
    throw new Error(error.message);
  }

  const usedSlugs = new Map();
  let slugUpdates = 0;
  let colorCreates = 0;

  for (const product of products ?? []) {
    const nextSlug = await resolveUniqueProductSlug(product, usedSlugs);
    if (nextSlug !== product.slug) {
      const { error: updateError } = await client.from("products").update({ slug: nextSlug }).eq("id", product.id);
      if (updateError) throw new Error(updateError.message);
      slugUpdates += 1;
      console.log(`Updated slug for ${product.id}: ${product.slug || "(empty)"} -> ${nextSlug}`);
    }

    const { count, error: countError } = await client
      .from("product_colors")
      .select("*", { count: "exact", head: true })
      .eq("product_id", product.id);

    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) continue;

    const { error: colorError } = await client.from("product_colors").upsert({
      id: `color-default-${product.id}`,
      product_id: product.id,
      color_name_ar: "افتراضي",
      color_name_he: "ברירת מחדל",
      value: "#d4af37",
      stock_quantity: 1,
    });

    if (colorError) throw new Error(colorError.message);
    colorCreates += 1;
    console.log(`Created default color for ${product.id}`);
  }

  console.log(`Done. Slug updates: ${slugUpdates}, default colors created: ${colorCreates}.`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
