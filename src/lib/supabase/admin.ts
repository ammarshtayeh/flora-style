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
import { createBrowserSupabaseClient, isSupabaseEnabled } from "./client";

function getClient() {
  return createBrowserSupabaseClient();
}

function requireClient() {
  const client = getClient();
  if (!client || !isSupabaseEnabled()) {
    throw new Error("Supabase is not configured.");
  }
  return client;
}

export async function upsertCategory(category: Category) {
  const client = requireClient();
  const { error } = await client.from("categories").upsert({
    id: category.id,
    slug: category.slug,
    name_ar: category.nameAr,
    name_he: category.nameHe,
    description_ar: category.descriptionAr,
    description_he: category.descriptionHe,
    image_url: category.imageUrl,
    active: category.active,
  });

  if (error) throw error;
}

export async function upsertBrand(brand: Brand) {
  const client = requireClient();
  const { error } = await client.from("brands").upsert({
    id: brand.id,
    slug: brand.slug,
    name_ar: brand.nameAr,
    name_he: brand.nameHe,
    description_ar: brand.descriptionAr,
    description_he: brand.descriptionHe,
    logo_url: brand.logoUrl,
    active: brand.active,
  });

  if (error) throw error;
}

export async function upsertProduct(product: Product) {
  const client = requireClient();

  const { error: productError } = await client.from("products").upsert({
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    category_id: product.categoryId,
    brand_id: product.brandId,
    name_ar: product.nameAr,
    name_he: product.nameHe,
    description_ar: product.descriptionAr,
    description_he: product.descriptionHe,
    story_ar: product.storyAr,
    story_he: product.storyHe,
    price: product.price,
    sale_price: product.salePrice ?? null,
    best_seller: product.bestSeller,
    featured: product.featured,
    active: product.active,
    created_at: product.createdAt,
  });

  if (productError) throw productError;

  const { error: deleteImagesError } = await client.from("product_images").delete().eq("product_id", product.id);
  if (deleteImagesError) throw deleteImagesError;

  if (product.images.length) {
    const { error: imagesError } = await client.from("product_images").insert(
      product.images.map((image, index) => ({
        product_id: product.id,
        image_url: image,
        sort_order: index,
      }))
    );

    if (imagesError) throw imagesError;
  }
}

export async function upsertColor(color: ProductColor) {
  const client = requireClient();
  const { error } = await client.from("product_colors").upsert({
    id: color.id,
    product_id: color.productId,
    color_name_ar: color.nameAr,
    color_name_he: color.nameHe,
    value: color.value,
    stock_quantity: color.stockQuantity,
  });

  if (error) throw error;
}

export async function upsertDeliveryZone(zone: DeliveryZone) {
  const client = requireClient();
  const { error } = await client.from("delivery_zones").upsert({
    id: zone.id,
    name_ar: zone.nameAr,
    name_he: zone.nameHe,
    delivery_fee: zone.deliveryFee,
    active: zone.active,
  });

  if (error) throw error;
}

export async function upsertBanner(banner: Banner) {
  const client = requireClient();
  const { error } = await client.from("banners").upsert({
    id: banner.id,
    title_ar: banner.titleAr,
    title_he: banner.titleHe,
    subtitle_ar: banner.subtitleAr,
    subtitle_he: banner.subtitleHe,
    image_url: banner.imageUrl,
    active: banner.active,
  });

  if (error) throw error;
}

export async function saveSettings(settings: StoreSettings) {
  const client = requireClient();
  const { error } = await client.from("store_settings").upsert({
    id: 1,
    store_name: settings.storeName,
    whatsapp_number: settings.whatsappNumber,
    instagram_url: settings.instagramUrl,
    facebook_url: settings.facebookUrl,
    tiktok_url: settings.tiktokUrl,
    email: settings.email,
    address_ar: settings.addressAr,
    address_he: settings.addressHe,
  });

  if (error) throw error;
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
  const client = requireClient();
  const { error } = await client.from(table).delete().eq("id", id);
  if (error) throw error;
}

export async function seedStoreFromInitialData(seed: StoreData = initialStoreData) {
  const client = requireClient();

  await client.from("product_images").delete().neq("product_id", "__none__");
  await client.from("product_colors").delete().neq("id", "__none__");
  await client.from("order_items").delete().neq("order_id", "__none__");
  await client.from("orders").delete().neq("id", "__none__");
  await client.from("products").delete().neq("id", "__none__");
  await client.from("brands").delete().neq("id", "__none__");
  await client.from("categories").delete().neq("id", "__none__");
  await client.from("delivery_zones").delete().neq("id", "__none__");
  await client.from("banners").delete().neq("id", "__none__");

  if (seed.categories.length) {
    const { error } = await client.from("categories").insert(
      seed.categories.map((category) => ({
        id: category.id,
        slug: category.slug,
        name_ar: category.nameAr,
        name_he: category.nameHe,
        description_ar: category.descriptionAr,
        description_he: category.descriptionHe,
        image_url: category.imageUrl,
        active: category.active,
      }))
    );
    if (error) throw error;
  }

  if (seed.brands.length) {
    const { error } = await client.from("brands").insert(
      seed.brands.map((brand) => ({
        id: brand.id,
        slug: brand.slug,
        name_ar: brand.nameAr,
        name_he: brand.nameHe,
        description_ar: brand.descriptionAr,
        description_he: brand.descriptionHe,
        logo_url: brand.logoUrl,
        active: brand.active,
      }))
    );
    if (error) throw error;
  }

  if (seed.products.length) {
    const { error } = await client.from("products").insert(
      seed.products.map((product) => ({
        id: product.id,
        slug: product.slug,
        sku: product.sku,
        category_id: product.categoryId,
        brand_id: product.brandId,
        name_ar: product.nameAr,
        name_he: product.nameHe,
        description_ar: product.descriptionAr,
        description_he: product.descriptionHe,
        story_ar: product.storyAr,
        story_he: product.storyHe,
        price: product.price,
        sale_price: product.salePrice ?? null,
        best_seller: product.bestSeller,
        featured: product.featured,
        active: product.active,
        created_at: product.createdAt,
      }))
    );
    if (error) throw error;
  }

  const imagesPayload = seed.products.flatMap((product) =>
    product.images.map((image, index) => ({
      product_id: product.id,
      image_url: image,
      sort_order: index,
    }))
  );

  if (imagesPayload.length) {
    const { error } = await client.from("product_images").insert(imagesPayload);
    if (error) throw error;
  }

  if (seed.colors.length) {
    const { error } = await client.from("product_colors").insert(
      seed.colors.map((color) => ({
        id: color.id,
        product_id: color.productId,
        color_name_ar: color.nameAr,
        color_name_he: color.nameHe,
        value: color.value,
        stock_quantity: color.stockQuantity,
      }))
    );
    if (error) throw error;
  }

  if (seed.deliveryZones.length) {
    const { error } = await client.from("delivery_zones").insert(
      seed.deliveryZones.map((zone) => ({
        id: zone.id,
        name_ar: zone.nameAr,
        name_he: zone.nameHe,
        delivery_fee: zone.deliveryFee,
        active: zone.active,
      }))
    );
    if (error) throw error;
  }

  if (seed.banners.length) {
    const { error } = await client.from("banners").insert(
      seed.banners.map((banner) => ({
        id: banner.id,
        title_ar: banner.titleAr,
        title_he: banner.titleHe,
        subtitle_ar: banner.subtitleAr,
        subtitle_he: banner.subtitleHe,
        image_url: banner.imageUrl,
        active: banner.active,
      }))
    );
    if (error) throw error;
  }

  await saveSettings(seed.settings);
}
