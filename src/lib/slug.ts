type ProductSlugInput = {
  slug?: string;
  sku?: string;
  nameHe?: string;
  nameAr?: string;
  id: string;
};

export function slugify(value: string) {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0590-\u05ff\u0600-\u06ff]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized;
}

export function buildProductSlug(input: ProductSlugInput) {
  const manual = input.slug?.trim();
  if (manual) {
    const fromManual = slugify(manual);
    if (fromManual) return fromManual;
  }

  const fromSku = input.sku?.trim();
  if (fromSku) {
    const skuSlug = slugify(fromSku);
    if (skuSlug) return skuSlug;
  }

  const fromHebrew = input.nameHe?.trim();
  if (fromHebrew) {
    const heSlug = slugify(fromHebrew);
    if (heSlug) return heSlug;
  }

  const fromArabic = input.nameAr?.trim();
  if (fromArabic) {
    const arSlug = slugify(fromArabic);
    if (arSlug) return arSlug;
  }

  const idSuffix = input.id.replace(/^prod-?/i, "").slice(-12) || Date.now().toString(36);
  return `product-${idSuffix}`;
}
