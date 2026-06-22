"use client";

import Link from "next/link";
import { useMemo } from "react";
import { getBrandDisplayName, type Brand, type Language } from "@/lib/store";

type BrandTickerProps = {
  brands: Brand[];
  language: Language;
};

export function BrandTicker({ brands, language }: BrandTickerProps) {
  const loop = useMemo(() => [...brands, ...brands], [brands]);

  if (!brands.length) return null;

  return (
    <section aria-label={language === "he" ? "מותגים" : "البراندات"} className="flora-brand-ticker">
      <div className="flora-brand-ticker__viewport">
        <div className="flora-brand-ticker__track">
          {loop.map((brand, index) => (
            <span className="flora-brand-ticker__group" key={`${brand.id}-${index}`}>
              <Link className="flora-brand-ticker__item" href={`/shop?brand=${brand.id}`}>
                {getBrandDisplayName(language, brand)}
              </Link>
              <span aria-hidden className="flora-brand-ticker__sep" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
