import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetails } from "@/components/product-details";
import { formatPrice, initialStoreData, textByLanguage } from "@/lib/store";
import { siteUrl } from "@/lib/site";
import { fetchProductPageData, fetchProductSlugs } from "@/lib/supabase/catalog";
import { createStaticSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const supabase = createStaticSupabaseClient();
  const slugs = await fetchProductSlugs(supabase);
  return (slugs.length ? slugs : initialStoreData.products.map((product) => product.slug)).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createStaticSupabaseClient();
  const pageData = await fetchProductPageData(slug, supabase);
  const product = pageData?.product;
  if (!product) return {};

  const title = `${product.nameAr} | Flora Style`;
  const description = product.descriptionAr;
  const canonical = `/products/${product.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: [{ url: product.images[0], width: 1200, height: 900, alt: product.nameAr }],
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [product.images[0]]
    }
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();
  const pageData = await fetchProductPageData(slug, supabase);
  if (!pageData) notFound();

  const { product, brand, category, colors } = pageData;
  const stock = colors.reduce((sum, color) => sum + color.stockQuantity, 0);
  const price = product.salePrice ?? product.price;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.nameAr,
    description: product.descriptionAr,
    image: product.images,
    sku: product.sku,
    brand: { "@type": "Brand", name: brand?.nameAr ?? "Flora Style" },
    category: category?.nameAr,
    offers: {
      "@type": "Offer",
      priceCurrency: "ILS",
      price,
      availability: stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${siteUrl}/products/${product.slug}`
    }
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <ProductDetails
        product={product}
        brandNameAr={brand?.nameAr ?? "Flora Style"}
        brandNameHe={brand?.nameHe ?? "Flora Style"}
        categoryNameAr={category?.nameAr ?? ""}
        categoryNameHe={category?.nameHe ?? ""}
        initialColors={colors}
        formattedPrice={formatPrice(price)}
        arName={textByLanguage("ar", product.nameAr, product.nameHe)}
      />
    </>
  );
}
