import type { MetadataRoute } from "next";
import { initialStoreData } from "@/lib/store";
import { siteUrl } from "@/lib/site";
import { fetchProductSlugs } from "@/lib/supabase/catalog";
import { createStaticSupabaseClient } from "@/lib/supabase/public";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteUrl;
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/checkout`, changeFrequency: "monthly", priority: 0.5 }
  ];

  const supabase = createStaticSupabaseClient();
  const slugs = await fetchProductSlugs(supabase);
  const finalSlugs = slugs.length ? slugs : initialStoreData.products.filter((product) => product.active).map((product) => product.slug);

  const productRoutes: MetadataRoute.Sitemap = finalSlugs.map((slug) => ({
      url: `${baseUrl}/products/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8
    }));

  return [...staticRoutes, ...productRoutes];
}
