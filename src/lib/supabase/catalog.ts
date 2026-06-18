import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type Banner,
  type Brand,
  type Category,
  initialStoreData,
  type Order,
  type Product,
  type ProductColor,
  type StoreData,
  type StoreSettings,
} from "@/lib/store";
import { createBrowserSupabaseClient, isSupabaseEnabled, supabase } from "./client";
import { fetchOrders } from "./orders";

type CategoryRow = {
  id: string;
  slug: string;
  name_ar: string;
  name_he: string;
  description_ar: string | null;
  description_he: string | null;
  image_url: string | null;
  active: boolean;
};

type BrandRow = {
  id: string;
  slug: string;
  name_ar: string;
  name_he: string;
  description_ar: string | null;
  description_he: string | null;
  logo_url: string | null;
  active: boolean;
};

type ProductRow = {
  id: string;
  slug: string;
  sku: string;
  category_id: string;
  brand_id: string;
  name_ar: string;
  name_he: string;
  description_ar: string | null;
  description_he: string | null;
  story_ar: string | null;
  story_he: string | null;
  price: number | string;
  sale_price: number | string | null;
  best_seller: boolean;
  featured: boolean;
  active: boolean;
  created_at: string;
};

type ProductImageRow = {
  product_id: string;
  image_url: string;
  sort_order: number;
};

type ProductColorRow = {
  id: string;
  product_id: string;
  color_name_ar: string;
  color_name_he: string;
  value: string;
  stock_quantity: number;
};

type DeliveryZoneRow = {
  id: string;
  name_ar: string;
  name_he: string;
  delivery_fee: number | string;
  active: boolean;
};

type BannerRow = {
  id: string;
  title_ar: string;
  title_he: string;
  subtitle_ar: string | null;
  subtitle_he: string | null;
  image_url: string;
  active: boolean;
};

type StoreSettingsRow = {
  id: number;
  store_name: string;
  whatsapp_number: string;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  email: string | null;
  address_ar: string | null;
  address_he: string | null;
};

function getClient(client?: SupabaseClient | null) {
  if (client) {
    return client;
  }

  if (typeof window !== "undefined") {
    return supabase ?? createBrowserSupabaseClient();
  }

  return null;
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    slug: row.slug,
    nameAr: row.name_ar,
    nameHe: row.name_he,
    descriptionAr: row.description_ar ?? "",
    descriptionHe: row.description_he ?? "",
    imageUrl: row.image_url ?? "",
    active: row.active,
  };
}

function mapBrand(row: BrandRow): Brand {
  return {
    id: row.id,
    slug: row.slug,
    nameAr: row.name_ar,
    nameHe: row.name_he,
    descriptionAr: row.description_ar ?? "",
    descriptionHe: row.description_he ?? "",
    logoUrl: row.logo_url ?? "/flora-logo.png",
    active: row.active,
  };
}

function mapColor(row: ProductColorRow): ProductColor {
  return {
    id: row.id,
    productId: row.product_id,
    nameAr: row.color_name_ar,
    nameHe: row.color_name_he,
    value: row.value,
    stockQuantity: Number(row.stock_quantity),
  };
}

function mapZone(row: DeliveryZoneRow) {
  return {
    id: row.id,
    nameAr: row.name_ar,
    nameHe: row.name_he,
    deliveryFee: Number(row.delivery_fee),
    active: row.active,
  };
}

function mapBanner(row: BannerRow): Banner {
  return {
    id: row.id,
    titleAr: row.title_ar,
    titleHe: row.title_he,
    subtitleAr: row.subtitle_ar ?? "",
    subtitleHe: row.subtitle_he ?? "",
    imageUrl: row.image_url,
    active: row.active,
  };
}

function mapSettings(row?: StoreSettingsRow | null): StoreSettings {
  if (!row) {
    return initialStoreData.settings;
  }

  return {
    storeName: row.store_name,
    whatsappNumber: row.whatsapp_number,
    instagramUrl: row.instagram_url ?? "",
    facebookUrl: row.facebook_url ?? "",
    tiktokUrl: row.tiktok_url ?? "",
    email: row.email ?? "",
    addressAr: row.address_ar ?? "",
    addressHe: row.address_he ?? "",
  };
}

function mapProduct(row: ProductRow, imagesMap: Map<string, string[]>): Product {
  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    categoryId: row.category_id,
    brandId: row.brand_id ?? "",
    nameAr: row.name_ar,
    nameHe: row.name_he,
    descriptionAr: row.description_ar ?? "",
    descriptionHe: row.description_he ?? "",
    storyAr: row.story_ar ?? "",
    storyHe: row.story_he ?? "",
    price: Number(row.price),
    salePrice: row.sale_price === null ? undefined : Number(row.sale_price),
    images: imagesMap.get(row.id) ?? [],
    bestSeller: row.best_seller,
    featured: row.featured,
    active: row.active,
    createdAt: row.created_at.slice(0, 10),
  };
}

export async function fetchStoreData(client?: SupabaseClient | null): Promise<StoreData> {
  const activeClient = getClient(client);

  if (!activeClient || !isSupabaseEnabled()) {
    return initialStoreData;
  }

  try {
    const [
      categoriesResult,
      brandsResult,
      productsResult,
      imagesResult,
      colorsResult,
      zonesResult,
      bannersResult,
      settingsResult,
    ] = await Promise.all([
      activeClient.from("categories").select("*").order("slug"),
      activeClient.from("brands").select("*").order("slug"),
      activeClient.from("products").select("*").order("created_at", { ascending: false }),
      activeClient.from("product_images").select("product_id,image_url,sort_order").order("sort_order"),
      activeClient.from("product_colors").select("*").order("created_at"),
      activeClient.from("delivery_zones").select("*").order("created_at"),
      activeClient.from("banners").select("*").order("created_at"),
      activeClient.from("store_settings").select("*").order("id").limit(1).maybeSingle(),
    ]);

    if (
      categoriesResult.error ||
      brandsResult.error ||
      productsResult.error ||
      imagesResult.error ||
      colorsResult.error ||
      zonesResult.error ||
      bannersResult.error ||
      settingsResult.error
    ) {
      throw new Error(
        [
          categoriesResult.error?.message,
          brandsResult.error?.message,
          productsResult.error?.message,
          imagesResult.error?.message,
          colorsResult.error?.message,
          zonesResult.error?.message,
          bannersResult.error?.message,
          settingsResult.error?.message,
        ]
          .filter(Boolean)
          .join(" | ")
      );
    }

    const imagesMap = new Map<string, string[]>();
    for (const image of (imagesResult.data ?? []) as ProductImageRow[]) {
      const current = imagesMap.get(image.product_id) ?? [];
      current.push(image.image_url);
      imagesMap.set(image.product_id, current);
    }

    const storeData: StoreData = {
      categories: ((categoriesResult.data ?? []) as CategoryRow[]).map(mapCategory),
      brands: ((brandsResult.data ?? []) as BrandRow[]).map(mapBrand),
      products: ((productsResult.data ?? []) as ProductRow[]).map((row) => mapProduct(row, imagesMap)),
      colors: ((colorsResult.data ?? []) as ProductColorRow[]).map(mapColor),
      deliveryZones: ((zonesResult.data ?? []) as DeliveryZoneRow[]).map(mapZone),
      banners: ((bannersResult.data ?? []) as BannerRow[]).map(mapBanner),
      settings: mapSettings(settingsResult.data as StoreSettingsRow | null),
      orders: [],
    };

    return storeData;
  } catch (error) {
    console.error("[Supabase] fetchStoreData failed", error);
    return initialStoreData;
  }
}

export async function fetchStoreDataWithOrders(client?: SupabaseClient | null): Promise<StoreData> {
  const data = await fetchStoreData(client);
  const orders = await fetchOrders();
  return { ...data, orders };
}

export async function fetchProductBySlug(slug: string, client?: SupabaseClient | null) {
  const data = await fetchStoreData(client);
  return data.products.find((product) => product.active && (product.slug === slug || product.id === slug)) ?? null;
}

function findActiveProduct(data: StoreData, slug: string) {
  return data.products.find((item) => item.active && (item.slug === slug || item.id === slug));
}

export async function fetchProductPageData(slug: string, client?: SupabaseClient | null) {
  const data = await fetchStoreData(client);
  const product = findActiveProduct(data, slug);

  if (!product) {
    return null;
  }

  const brand = data.brands.find((item) => item.id === product.brandId) ?? null;
  const category = data.categories.find((item) => item.id === product.categoryId) ?? null;
  const colors = data.colors.filter((item) => item.productId === product.id);
  const related = data.products
    .filter(
      (candidate) =>
        candidate.id !== product.id &&
        candidate.active &&
        (candidate.categoryId === product.categoryId || candidate.brandId === product.brandId)
    )
    .slice(0, 4);

  return { data, product, brand, category, colors, related };
}

export async function fetchProductSlugs(client?: SupabaseClient | null) {
  const data = await fetchStoreData(client);
  return data.products.filter((product) => product.active && product.slug.trim()).map((product) => product.slug);
}

export async function isCatalogSeeded(client?: SupabaseClient | null) {
  const activeClient = getClient(client);
  if (!activeClient || !isSupabaseEnabled()) {
    return false;
  }

  const { count, error } = await activeClient
    .from("products")
    .select("*", { count: "exact", head: true });

  if (error) {
    return false;
  }

  return (count ?? 0) > 0;
}
