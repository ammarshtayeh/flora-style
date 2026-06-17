import type { MetadataRoute } from "next";
import { initialStoreData } from "@/lib/store";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://flora-style.vercel.app";
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/checkout`, changeFrequency: "monthly", priority: 0.5 }
  ];

  const productRoutes: MetadataRoute.Sitemap = initialStoreData.products
    .filter((product) => product.active)
    .map((product) => ({
      url: `${baseUrl}/products/${product.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8
    }));

  return [...staticRoutes, ...productRoutes];
}
