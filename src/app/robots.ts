import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/shop", "/products/"],
      disallow: ["/admin"]
    },
    sitemap: "https://flora-style.vercel.app/sitemap.xml"
  };
}
