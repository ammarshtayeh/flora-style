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

const GROUP_GAP_MS = 3 * 60 * 1000;

function publicUrl(fileName) {
  return `${supabaseUrl}/storage/v1/object/public/flora-assets/products/${fileName}`;
}

function groupByUploadSession(files) {
  const sorted = [...files].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const groups = [];
  let current = [];

  for (const file of sorted) {
    if (!current.length) {
      current.push(file);
      continue;
    }

    const last = current[current.length - 1];
    const gap = new Date(file.created_at).getTime() - new Date(last.created_at).getTime();
    if (gap > GROUP_GAP_MS) {
      groups.push(current);
      current = [file];
    } else {
      current.push(file);
    }
  }

  if (current.length) groups.push(current);
  return groups;
}

async function run() {
  const [{ data: files, error: filesError }, { data: linkedImages, error: imagesError }, { data: categories, error: catError }, { data: brands, error: brandError }, { data: existingProducts, error: prodError }] =
    await Promise.all([
      client.storage.from("flora-assets").list("products", { limit: 200, sortBy: { column: "created_at", order: "asc" } }),
      client.from("product_images").select("image_url"),
      client.from("categories").select("id").eq("active", true).order("slug").limit(1),
      client.from("brands").select("id").eq("active", true).order("slug").limit(1),
      client.from("products").select("id,sku").like("sku", "REC-%"),
    ]);

  if (filesError || imagesError || catError || brandError || prodError) {
    throw new Error(filesError?.message || imagesError?.message || catError?.message || brandError?.message || prodError?.message);
  }

  const categoryId = categories?.[0]?.id;
  if (!categoryId) {
    throw new Error("No active category found. Run sync base catalog first.");
  }

  const brandId = brands?.[0]?.id ?? null;
  const linked = new Set((linkedImages ?? []).map((row) => row.image_url.split("/").pop()));
  const orphans = (files ?? []).filter((file) => file.name && !linked.has(file.name));

  if (!orphans.length) {
    console.log("No orphan images to recover.");
    return;
  }

  const existingRecoverCount = existingProducts?.length ?? 0;
  const groups = groupByUploadSession(orphans);
  let created = 0;

  console.log(`Found ${orphans.length} orphan images in ${groups.length} product groups.`);

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    const sequence = String(existingRecoverCount + index + 1).padStart(3, "0");
    const productId = `prod-recover-${sequence}`;
    const sku = `REC-${sequence}`;
    const slug = `recover-${sequence}`;
    const label = `منتج مسترجع ${sequence}`;

    const { data: existingSku } = await client.from("products").select("id").eq("sku", sku).maybeSingle();
    if (existingSku) {
      console.log(`Skip ${sku} (already exists)`);
      continue;
    }

    const imageUrls = group.map((file) => publicUrl(file.name));
    const createdAt = group[0].created_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

    const { error: productError } = await client.from("products").insert({
      id: productId,
      slug,
      sku,
      category_id: categoryId,
      brand_id: brandId,
      name_ar: label,
      name_he: `מוצר משוחזר ${sequence}`,
      description_ar: "منتج مسترجع من الصور المحفوظة. عدّلي الاسم والسعر والتفاصيل من لوحة الأدمن.",
      description_he: "מוצר שוחזר מהתמונות השמורות. עדכני שם, מחיר ופרטים בלוח הניהול.",
      story_ar: "",
      story_he: "",
      price: 1,
      sale_price: null,
      best_seller: false,
      featured: false,
      active: true,
      created_at: createdAt,
    });

    if (productError) throw new Error(`product ${sku}: ${productError.message}`);

    const { error: imagesInsertError } = await client.from("product_images").insert(
      imageUrls.map((image_url, sort_order) => ({
        product_id: productId,
        image_url,
        sort_order,
      }))
    );

    if (imagesInsertError) throw new Error(`images ${sku}: ${imagesInsertError.message}`);

    const { error: colorError } = await client.from("product_colors").insert({
      id: `color-${productId}-default`,
      product_id: productId,
      color_name_ar: "افتراضي",
      color_name_he: "ברירת מחדל",
      value: "#d4af37",
      stock_quantity: 1,
    });

    if (colorError) throw new Error(`color ${sku}: ${colorError.message}`);

    created += 1;
    console.log(`Created ${sku} with ${imageUrls.length} image(s).`);
  }

  const { count } = await client.from("products").select("*", { count: "exact", head: true });
  console.log(`Done. Recovered products: ${created}. Total products now: ${count ?? "?"}.`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
