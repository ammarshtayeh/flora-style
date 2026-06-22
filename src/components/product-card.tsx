"use client";

import { Eye, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice, type Language, type Product, textByLanguage } from "@/lib/store";

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='500' viewBox='0 0 400 500'%3E%3Crect fill='%23f3ede4' width='400' height='500'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23b08b57' font-size='18' font-family='sans-serif'%3EFlora Style%3C/text%3E%3C/svg%3E";

type ProductCardProps = {
  product: Product;
  language: Language;
  stock: number;
  addLabel: string;
  viewLabel: string;
  soldOutLabel: string;
  onAdd?: (product: Product) => void;
  showDescription?: boolean;
  compact?: boolean;
};

export function ProductCard({
  product,
  language,
  stock,
  addLabel,
  viewLabel,
  soldOutLabel,
  onAdd,
  showDescription = false,
  compact = false,
}: ProductCardProps) {
  const isSoldOut = stock <= 0;
  const href = `/products/${product.slug || product.id}`;
  const primaryImage = product.images[0] || PLACEHOLDER;
  const secondaryImage = product.images[1] ?? primaryImage;
  const name = textByLanguage(language, product.nameAr, product.nameHe);

  return (
    <article className={`luxury-product${compact ? " luxury-product--compact" : ""}`.trim()}>
      <Link className={`luxury-product__image${compact ? " luxury-product__image--compact" : ""}`.trim()} href={href}>
        <Image
          className="primary"
          src={primaryImage}
          alt={name}
          fill
          sizes={compact ? "(max-width: 900px) 50vw, 20vw" : "(max-width: 900px) 50vw, 25vw"}
          unoptimized={primaryImage.startsWith("data:")}
        />
        {product.images[1] ? (
          <Image
            className="secondary"
            src={secondaryImage}
            alt=""
            fill
            sizes={compact ? "(max-width: 900px) 50vw, 20vw" : "(max-width: 900px) 50vw, 25vw"}
          />
        ) : null}
        {isSoldOut ? <span className="luxury-product__badge">{soldOutLabel}</span> : null}
      </Link>

      <div className="luxury-product__body">
        <div className="luxury-product__meta">
          <Link href={href}>
            <h3>{name}</h3>
          </Link>
          {showDescription ? (
            <p>{textByLanguage(language, product.descriptionAr, product.descriptionHe)}</p>
          ) : null}
          <div className="luxury-product__bottom">
            <strong>{formatPrice(product.salePrice ?? product.price)}</strong>
          </div>
        </div>

        <div className="luxury-product__actions">
          <Link href={href}>
            <Eye size={15} />
            {viewLabel}
          </Link>
          {!compact ? (
            <button disabled={isSoldOut || !onAdd} onClick={() => onAdd?.(product)} type="button">
              <ShoppingBag size={15} />
              {addLabel}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
