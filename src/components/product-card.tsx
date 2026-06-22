"use client";

import { Eye, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { formatPrice, type Language, type Product, textByLanguage } from "@/lib/store";

const cardReveal: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] },
  },
};

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
  const body = (
    <>
      <Link className={`luxury-product__image ${compact ? "luxury-product__image--compact" : ""}`.trim()} href={`/products/${product.slug || product.id}`}>
        <Image
          className="primary"
          src={product.images[0]}
          alt={textByLanguage(language, product.nameAr, product.nameHe)}
          fill
          sizes={compact ? "(max-width: 900px) 50vw, 20vw" : "(max-width: 900px) 50vw, 25vw"}
        />
        <Image
          className="secondary"
          src={product.images[1] ?? product.images[0]}
          alt=""
          fill
          sizes={compact ? "(max-width: 900px) 50vw, 20vw" : "(max-width: 900px) 50vw, 25vw"}
        />
      </Link>
      <div className="luxury-product__meta">
        <Link href={`/products/${product.slug || product.id}`}>
          <h3>{textByLanguage(language, product.nameAr, product.nameHe)}</h3>
        </Link>
        {showDescription ? <p>{textByLanguage(language, product.descriptionAr, product.descriptionHe)}</p> : null}
        <div className="luxury-product__bottom">
          <strong>{formatPrice(product.salePrice ?? product.price)}</strong>
          {isSoldOut ? <span>{soldOutLabel}</span> : null}
        </div>
      </div>
      <div className="floating-actions">
        <Link href={`/products/${product.slug || product.id}`}>
          <Eye size={15} />
          {viewLabel}
        </Link>
        {!compact ? (
          <button disabled={stock <= 0 || !onAdd} onClick={() => onAdd?.(product)} type="button">
            <ShoppingBag size={15} />
            {addLabel}
          </button>
        ) : null}
      </div>
    </>
  );

  if (compact) {
    return (
      <motion.article
        className="luxury-product luxury-product--compact"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={cardReveal}
      >
        {body}
      </motion.article>
    );
  }

  return (
    <motion.article
      className="luxury-product"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={cardReveal}
      whileHover={{ y: -10 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
    >
      {body}
    </motion.article>
  );
}
