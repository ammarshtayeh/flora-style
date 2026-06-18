import type {
  Banner,
  Brand,
  Category,
  DeliveryZone,
  Product,
  ProductColor,
  StoreData,
  StoreSettings,
} from "@/lib/store";
import { initialStoreData } from "@/lib/store";
import { isSupabaseEnabled } from "./client";

async function adminCatalogRequest(action: string, payload?: unknown) {
  if (!isSupabaseEnabled()) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch("/api/admin/catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload === undefined ? { action } : { action, payload }),
  });

  const result = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(result.error || "تعذر تنفيذ العملية.");
  }
}

export async function upsertCategory(category: Category) {
  await adminCatalogRequest("upsertCategory", category);
}

export async function upsertBrand(brand: Brand) {
  await adminCatalogRequest("upsertBrand", brand);
}

export async function upsertProduct(product: Product, defaultStock?: number) {
  await adminCatalogRequest("upsertProduct", { product, defaultStock });
}

export async function upsertColor(color: ProductColor) {
  await adminCatalogRequest("upsertColor", color);
}

export async function upsertDeliveryZone(zone: DeliveryZone) {
  await adminCatalogRequest("upsertDeliveryZone", zone);
}

export async function upsertBanner(banner: Banner) {
  await adminCatalogRequest("upsertBanner", banner);
}

export async function saveSettings(settings: StoreSettings) {
  await adminCatalogRequest("saveSettings", settings);
}

export async function uploadAdminAsset(file: File, folder: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await fetch("/api/admin/upload", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !payload.url) {
    throw new Error(payload.error || "تعذر رفع الصورة.");
  }

  return payload.url;
}

export async function uploadAdminAssets(files: File[], folder: string) {
  return Promise.all(files.map((file) => uploadAdminAsset(file, folder)));
}

export async function deleteEntity(
  table:
    | "products"
    | "categories"
    | "brands"
    | "product_colors"
    | "delivery_zones"
    | "banners"
    | "orders",
  id: string
) {
  await adminCatalogRequest("deleteEntity", { table, id });
}

export async function deleteBrand(id: string) {
  await adminCatalogRequest("deleteBrand", { id });
}

export async function clearCatalogAndOrders() {
  await adminCatalogRequest("clearCatalogAndOrders");
}

export async function repairCatalog() {
  await adminCatalogRequest("repairCatalog");
}

export async function syncBaseCatalog(seed: StoreData = initialStoreData) {
  for (const category of seed.categories) {
    await upsertCategory(category);
  }

  for (const brand of seed.brands) {
    await upsertBrand(brand);
  }

  for (const zone of seed.deliveryZones) {
    await upsertDeliveryZone(zone);
  }

  for (const banner of seed.banners) {
    await upsertBanner(banner);
  }

  await saveSettings(seed.settings);
}

export async function seedStoreFromInitialData(seed: StoreData = initialStoreData) {
  await clearCatalogAndOrders();
  await syncBaseCatalog(seed);

  for (const product of seed.products) {
    await upsertProduct(product);
  }

  for (const color of seed.colors) {
    await upsertColor(color);
  }
}
