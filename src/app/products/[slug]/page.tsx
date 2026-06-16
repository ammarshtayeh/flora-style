import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetails } from "@/components/product-details";
import {
  formatPrice,
  getProductBrand,
  getProductBySlug,
  getProductCategory,
  getProductColors,
  initialStoreData,
  textByLanguage
} from "@/lib/store";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return initialStoreData.products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
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
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const brand = getProductBrand(product);
  const category = getProductCategory(product);
  const colors = getProductColors(product.id);
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
      url: `https://flora-style.vercel.app/products/${product.slug}`
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
