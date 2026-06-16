"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Eye, RotateCcw, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { addToCart } from "@/lib/cart";
import { loadStoreData, subscribeToStoreData } from "@/lib/db";
import { formatPrice, initialStoreData, Language, Product, textByLanguage } from "@/lib/store";

const shopCopy = {
  ar: {
    eyebrow: "Luxury Catalog",
    title: "تسوقي حسب الذوق، لا حسب الفوضى.",
    body: "كل ما تحتاجه Flora Style في مساحة أوضح: تصنيفات مباشرة، فلترة دقيقة، ونتائج تساعدك على الوصول بسرعة.",
    filters: "التصفية",
    categories: "التصنيفات",
    brands: "البراندات",
    priceRange: "نطاق السعر",
    minPrice: "من",
    maxPrice: "إلى",
    sortBy: "الترتيب",
    sortNewest: "الأحدث",
    sortPriceDesc: "السعر من الأعلى",
    sortPriceAsc: "السعر من الأقل",
    noProducts: "لا توجد منتجات مطابقة حالياً.",
    view: "عرض التفاصيل",
    add: "إضافة",
    soldOut: "نفد",
    clearAll: "تصفير الفلاتر",
    searchLabel: "نتائج البحث",
    results: "نتيجة",
    available: "جاهز للطلب",
    pieces: "قطعة",
    allProducts: "كل المنتجات",
    matching: "النتائج الحالية",
    spotlight: "ابدئي من التصنيف الأقرب لك",
    spotlightBody: "اختاري التصنيف أولاً ثم دققي بالبراند والسعر للوصول الأسرع.",
    activeFilters: "الفلاتر المفعلة"
  },
  he: {
    eyebrow: "Luxury Catalog",
    title: "קנייה לפי טעם, לא לפי עומס.",
    body: "כל מה שצריך מ-Flora Style במבנה ברור יותר: קטגוריות ישירות, סינון מדויק ותוצאות שמובילות מהר לפריט הנכון.",
    filters: "סינון",
    categories: "קטגוריות",
    brands: "מותגים",
    priceRange: "טווח מחיר",
    minPrice: "מ",
    maxPrice: "עד",
    sortBy: "מיון",
    sortNewest: "חדש באתר",
    sortPriceDesc: "מחיר מהגבוה לנמוך",
    sortPriceAsc: "מחיר מהנמוך לגבוה",
    noProducts: "לא נמצאו מוצרים תואמים כרגע.",
    view: "לפרטים",
    add: "הוספה",
    soldOut: "אזל",
    clearAll: "איפוס סינון",
    searchLabel: "תוצאות חיפוש",
    results: "תוצאות",
    available: "מוכן להזמנה",
    pieces: "יחידות",
    allProducts: "כל המוצרים",
    matching: "התוצאות הנוכחיות",
    spotlight: "התחילי מהקטגוריה הקרובה לך",
    spotlightBody: "בחרי קודם קטגוריה ואז דייקי לפי מותג ומחיר כדי להגיע מהר יותר.",
    activeFilters: "פילטרים פעילים"
  }
} as const;

type ShopLabels = (typeof shopCopy)[Language];

function ShopContent() {
  const searchParams = useSearchParams();
  const [storeData, setStoreData] = useState(initialStoreData);
  const [language, setLanguage] = useState<Language>("ar");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const labels = shopCopy[language];

  useEffect(() => {
    setStoreData(loadStoreData());
    return subscribeToStoreData(setStoreData);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("flora-language") as Language;
      if (saved === "ar" || saved === "he") setLanguage(saved);
    }
    const handleLangChange = (event: Event) => setLanguage((event as CustomEvent<Language>).detail);
    window.addEventListener("flora-language-changed", handleLangChange);
    return () => window.removeEventListener("flora-language-changed", handleLangChange);
  }, []);

  useEffect(() => {
    const categoryParam = searchParams?.get("category");
    setSelectedCategories(categoryParam ? [categoryParam] : []);
  }, [searchParams]);

  const activeCategories = useMemo(() => storeData.categories.filter((category) => category.active), [storeData.categories]);
  const activeBrands = useMemo(() => storeData.brands.filter((brand) => brand.active), [storeData.brands]);
  const searchQuery = (searchParams?.get("search") || "").trim().toLowerCase();

  const categoryCounts = useMemo(() => {
    return storeData.products.filter((product) => product.active).reduce<Record<string, number>>((acc, product) => {
      acc[product.categoryId] = (acc[product.categoryId] ?? 0) + 1;
      return acc;
    }, {});
  }, [storeData.products]);

  const filteredProducts = useMemo(() => {
    let result = storeData.products.filter((product) => product.active);

    if (searchQuery) {
      result = result.filter(
        (product) =>
          product.nameAr.toLowerCase().includes(searchQuery) ||
          product.nameHe.toLowerCase().includes(searchQuery) ||
          product.sku.toLowerCase().includes(searchQuery)
      );
    }

    if (selectedCategories.length) {
      result = result.filter((product) => selectedCategories.includes(product.categoryId));
    }

    if (selectedBrands.length) {
      result = result.filter((product) => selectedBrands.includes(product.brandId));
    }

    if (minPrice) {
      result = result.filter((product) => (product.salePrice ?? product.price) >= Number(minPrice));
    }

    if (maxPrice) {
      result = result.filter((product) => (product.salePrice ?? product.price) <= Number(maxPrice));
    }

    if (sortBy === "price-desc") {
      result = [...result].sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
    } else if (sortBy === "price-asc") {
      result = [...result].sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
    } else {
      result = [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    return result;
  }, [maxPrice, minPrice, searchQuery, selectedBrands, selectedCategories, sortBy, storeData.products]);

  const activeFilterLabels = useMemo(() => {
    const categoryEntries = selectedCategories
      .map((id) => activeCategories.find((category) => category.id === id))
      .filter(Boolean)
      .map((category) => ({ id: category!.id, type: "category" as const, label: textByLanguage(language, category!.nameAr, category!.nameHe) }));

    const brandEntries = selectedBrands
      .map((id) => activeBrands.find((brand) => brand.id === id))
      .filter(Boolean)
      .map((brand) => ({ id: brand!.id, type: "brand" as const, label: textByLanguage(language, brand!.nameAr, brand!.nameHe) }));

    return [...categoryEntries, ...brandEntries];
  }, [activeBrands, activeCategories, language, selectedBrands, selectedCategories]);

  function toggleCategory(id: string) {
    setSelectedCategories((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleBrand(id: string) {
    setSelectedBrands((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function resetFilters() {
    setSelectedCategories(searchParams?.get("category") ? [searchParams.get("category") as string] : []);
    setSelectedBrands([]);
    setMinPrice("");
    setMaxPrice("");
    setSortBy("newest");
  }

  function removeActiveFilter(type: "category" | "brand", id: string) {
    if (type === "category") {
      setSelectedCategories((current) => current.filter((item) => item !== id));
      return;
    }
    setSelectedBrands((current) => current.filter((item) => item !== id));
  }

  function handleAddToCart(product: Product) {
    const color = storeData.colors.find((entry) => entry.productId === product.id && entry.stockQuantity > 0);
    if (!color) return;
    addToCart(product.id, color.id, 1);
    window.dispatchEvent(new CustomEvent("flora-open-cart"));
  }

  const filterPanel = (
    <ShopFilterPanel
      activeBrands={activeBrands}
      activeCategories={activeCategories}
      categoryCounts={categoryCounts}
      labels={labels}
      language={language}
      maxPrice={maxPrice}
      minPrice={minPrice}
      onClose={() => setMobileFiltersOpen(false)}
      resetFilters={resetFilters}
      selectedBrands={selectedBrands}
      selectedCategories={selectedCategories}
      setMaxPrice={setMaxPrice}
      setMinPrice={setMinPrice}
      toggleBrand={toggleBrand}
      toggleCategory={toggleCategory}
    />
  );

  return (
    <>
      <Header />
      <main className="shop-page" dir="rtl">
        <section className="shop-hero">
          <p className="luxury-kicker">{labels.eyebrow}</p>
          <h1>{labels.title}</h1>
          <p>{labels.body}</p>
          <div className="shop-hero__meta">
            <span>
              <ShoppingBag size={15} />
              {filteredProducts.length} {labels.results}
            </span>
            {searchQuery ? (
              <span>
                <SlidersHorizontal size={15} />
                {labels.searchLabel}: {searchQuery}
              </span>
            ) : (
              <span>
                <SlidersHorizontal size={15} />
                {labels.allProducts}
              </span>
            )}
          </div>
        </section>

        <section className="shop-category-strip">
          <div className="shop-category-strip__head">
            <div>
              <span>{labels.spotlight}</span>
              <p>{labels.spotlightBody}</p>
            </div>
            <button className="shop-reset" onClick={resetFilters} type="button">
              <RotateCcw size={15} />
              {labels.clearAll}
            </button>
          </div>
          <div className="shop-category-strip__grid">
            {activeCategories.map((category) => (
              <button
                className={selectedCategories.includes(category.id) ? "is-active" : ""}
                key={category.id}
                onClick={() => toggleCategory(category.id)}
                type="button"
              >
                <Image src={category.imageUrl} alt={textByLanguage(language, category.nameAr, category.nameHe)} fill sizes="(max-width: 900px) 50vw, 20vw" />
                <span>{textByLanguage(language, category.nameAr, category.nameHe)}</span>
                <small>{categoryCounts[category.id] ?? 0}</small>
              </button>
            ))}
          </div>
        </section>

        <div className="shop-shell">
          <aside className="shop-sidebar">{filterPanel}</aside>

          <section className="shop-main">
            <div className="shop-toolbar">
              <div>
                <span>{labels.matching}</span>
                <h2>
                  {filteredProducts.length} {labels.results}
                </h2>
              </div>
              <div className="shop-toolbar__actions">
                <label className="shop-sort">
                  <span>{labels.sortBy}</span>
                  <select className="select" onChange={(event) => setSortBy(event.target.value)} value={sortBy}>
                    <option value="newest">{labels.sortNewest}</option>
                    <option value="price-desc">{labels.sortPriceDesc}</option>
                    <option value="price-asc">{labels.sortPriceAsc}</option>
                  </select>
                </label>
                <button className="shop-mobile-filter-trigger" onClick={() => setMobileFiltersOpen(true)} type="button">
                  <SlidersHorizontal size={16} />
                  {labels.filters}
                </button>
              </div>
            </div>

            {activeFilterLabels.length || minPrice || maxPrice ? (
              <div className="shop-active-filters">
                <span>{labels.activeFilters}</span>
                <div>
                  {activeFilterLabels.map((filter) => (
                    <button key={`${filter.type}-${filter.id}`} onClick={() => removeActiveFilter(filter.type, filter.id)} type="button">
                      {filter.label}
                    </button>
                  ))}
                  {minPrice ? <button onClick={() => setMinPrice("")} type="button">{labels.minPrice}: {minPrice}</button> : null}
                  {maxPrice ? <button onClick={() => setMaxPrice("")} type="button">{labels.maxPrice}: {maxPrice}</button> : null}
                </div>
              </div>
            ) : null}

            {filteredProducts.length ? (
              <div className="luxury-product-grid shop-product-grid">
                {filteredProducts.map((product) => {
                  const stock = storeData.colors
                    .filter((color) => color.productId === product.id)
                    .reduce((sum, color) => sum + color.stockQuantity, 0);

                  return (
                    <article className="luxury-product" key={product.id}>
                      <Link className="luxury-product__image" href={`/products/${product.slug}`}>
                        <Image className="primary" src={product.images[0]} alt={textByLanguage(language, product.nameAr, product.nameHe)} fill sizes="(max-width: 900px) 100vw, 33vw" />
                        <Image className="secondary" src={product.images[1] ?? product.images[0]} alt="" fill sizes="(max-width: 900px) 100vw, 33vw" />
                      </Link>
                      <div className="luxury-product__meta">
                        <span>{product.sku}</span>
                        <Link href={`/products/${product.slug}`}>
                          <h3>{textByLanguage(language, product.nameAr, product.nameHe)}</h3>
                        </Link>
                        <p>{textByLanguage(language, product.descriptionAr, product.descriptionHe)}</p>
                        <div className="luxury-product__bottom">
                          <strong>{formatPrice(product.salePrice ?? product.price)}</strong>
                          <span>{stock > 0 ? `${labels.available} · ${stock} ${labels.pieces}` : labels.soldOut}</span>
                        </div>
                      </div>
                      <div className="floating-actions">
                        <Link href={`/products/${product.slug}`}>
                          <Eye size={15} />
                          {labels.view}
                        </Link>
                        <button disabled={stock <= 0} onClick={() => handleAddToCart(product)}>
                          <ShoppingBag size={15} />
                          {labels.add}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="shop-empty">
                <strong>{labels.noProducts}</strong>
                <button className="shop-reset" onClick={resetFilters} type="button">
                  {labels.clearAll}
                </button>
              </div>
            )}
          </section>
        </div>

        <AnimatePresence>
          {mobileFiltersOpen ? (
            <motion.div
              animate={{ opacity: 1 }}
              className="shop-mobile-filter-overlay"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => setMobileFiltersOpen(false)}
            >
              <motion.div
                animate={{ y: 0 }}
                className="shop-mobile-filter-sheet"
                exit={{ y: "100%" }}
                initial={{ y: "100%" }}
                onClick={(event) => event.stopPropagation()}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                {filterPanel}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
    </>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="shop-page" />}>
      <ShopContent />
    </Suspense>
  );
}

function ShopFilterPanel({
  activeBrands,
  activeCategories,
  categoryCounts,
  labels,
  language,
  maxPrice,
  minPrice,
  onClose,
  resetFilters,
  selectedBrands,
  selectedCategories,
  setMaxPrice,
  setMinPrice,
  toggleBrand,
  toggleCategory
}: {
  activeBrands: Array<{ id: string; nameAr: string; nameHe: string; descriptionAr: string; descriptionHe: string }>;
  activeCategories: Array<{ id: string; nameAr: string; nameHe: string }>;
  categoryCounts: Record<string, number>;
  labels: ShopLabels;
  language: Language;
  maxPrice: string;
  minPrice: string;
  onClose?: () => void;
  resetFilters: () => void;
  selectedBrands: string[];
  selectedCategories: string[];
  setMaxPrice: (value: string) => void;
  setMinPrice: (value: string) => void;
  toggleBrand: (id: string) => void;
  toggleCategory: (id: string) => void;
}) {
  return (
    <div className="shop-filter-panel">
      <div className="shop-sidebar__head">
        <h2>{labels.filters}</h2>
        <div className="shop-sidebar__head-actions">
          <button className="shop-reset shop-reset--ghost" onClick={resetFilters} type="button">
            {labels.clearAll}
          </button>
          {onClose ? (
            <button aria-label={labels.filters} className="shop-mobile-filter-close" onClick={onClose} type="button">
              <X size={18} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="shop-filter-group">
        <span>{labels.categories}</span>
        <div className="shop-filter-list">
          {activeCategories.map((category) => (
            <label className="shop-check" key={category.id}>
              <input checked={selectedCategories.includes(category.id)} onChange={() => toggleCategory(category.id)} type="checkbox" />
              <em />
              <div>
                <strong>{textByLanguage(language, category.nameAr, category.nameHe)}</strong>
                <small>{categoryCounts[category.id] ?? 0}</small>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="shop-filter-group">
        <span>{labels.brands}</span>
        <div className="shop-filter-list">
          {activeBrands.map((brand) => (
            <label className="shop-check" key={brand.id}>
              <input checked={selectedBrands.includes(brand.id)} onChange={() => toggleBrand(brand.id)} type="checkbox" />
              <em />
              <div>
                <strong>{textByLanguage(language, brand.nameAr, brand.nameHe)}</strong>
                <small>{textByLanguage(language, brand.descriptionAr, brand.descriptionHe)}</small>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="shop-filter-group">
        <span>{labels.priceRange}</span>
        <div className="shop-price-fields">
          <input className="field" onChange={(event) => setMinPrice(event.target.value)} placeholder={labels.minPrice} type="number" value={minPrice} />
          <input className="field" onChange={(event) => setMaxPrice(event.target.value)} placeholder={labels.maxPrice} type="number" value={maxPrice} />
        </div>
      </div>
    </div>
  );
}
