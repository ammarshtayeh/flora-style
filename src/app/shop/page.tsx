"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { ProductCard } from "@/components/product-card";
import { addToCart } from "@/lib/cart";
import { loadStoreData, subscribeToStoreData } from "@/lib/db";
import { initialStoreData, Language, Product, textByLanguage } from "@/lib/store";

const shopCopy = {
  ar: {
    eyebrow: "Luxury Catalog",
    titleAll: "كل المنتجات",
    bodyAll: "تصفحي المجموعة كاملة — اختاري التصنيف ثم دققي بالماركة.",
    brands: "البراندات",
    sortBy: "الترتيب",
    sortNewest: "الأحدث",
    sortPriceDesc: "السعر من الأعلى",
    sortPriceAsc: "السعر من الأقل",
    noProducts: "لا توجد منتجات مطابقة حالياً.",
    view: "عرض",
    add: "إضافة",
    soldOut: "نفد",
    clearAll: "تصفير",
    searchLabel: "نتائج البحث",
    results: "نتيجة",
    available: "جاهز",
    pieces: "قطعة",
    allProducts: "الكل",
    allBrands: "كل البراندات",
    matching: "النتائج",
    pickCategory: "اختاري التصنيف",
    pickCategoryBody: "ابدئي من التصنيف المناسب ثم فلتري بالماركة.",
    activeFilters: "الفلاتر المفعلة",
    filters: "الفلترة"
  },
  he: {
    eyebrow: "Luxury Catalog",
    titleAll: "כל המוצרים",
    bodyAll: "עברי על כל האוסף — בחרי קטגוריה ואז סנני לפי מותג.",
    brands: "מותגים",
    sortBy: "מיון",
    sortNewest: "חדש באתר",
    sortPriceDesc: "מחיר מהגבוה לנמוך",
    sortPriceAsc: "מחיר מהנמוך לגבוה",
    noProducts: "לא נמצאו מוצרים תואמים כרגע.",
    view: "צפי",
    add: "הוספה",
    soldOut: "אזל",
    clearAll: "איפוס",
    searchLabel: "תוצאות חיפוש",
    results: "תוצאות",
    available: "זמין",
    pieces: "יחידות",
    allProducts: "הכל",
    allBrands: "כל המותגים",
    matching: "תוצאות",
    pickCategory: "בחרי קטגוריה",
    pickCategoryBody: "התחילי מהקטגוריה המתאימה ואז סנני לפי מותג.",
    activeFilters: "פילטרים פעילים",
    filters: "סינון"
  }
} as const;

type ShopLabels = (typeof shopCopy)[Language];

function ShopContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [storeData, setStoreData] = useState(initialStoreData);
  const [language, setLanguage] = useState<Language>("ar");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
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
    setSelectedCategoryId(searchParams?.get("category") || "");
    const brandParam = searchParams?.get("brand");
    setSelectedBrands(brandParam ? brandParam.split(",").filter(Boolean) : []);
  }, [searchParams]);

  const pushFilters = useCallback(
    (categoryId: string, brands: string[]) => {
      const params = new URLSearchParams();
      const search = searchParams?.get("search");
      if (search) params.set("search", search);
      if (categoryId) params.set("category", categoryId);
      if (brands.length) params.set("brand", brands.join(","));
      const query = params.toString();
      router.push(query ? `/shop?${query}` : "/shop", { scroll: false });
    },
    [router, searchParams]
  );

  const activeCategories = useMemo(() => storeData.categories.filter((category) => category.active), [storeData.categories]);
  const activeBrands = useMemo(() => storeData.brands.filter((brand) => brand.active), [storeData.brands]);
  const searchQuery = (searchParams?.get("search") || "").trim().toLowerCase();
  const currentCategory = useMemo(
    () => activeCategories.find((category) => category.id === selectedCategoryId),
    [activeCategories, selectedCategoryId]
  );

  const categoryCounts = useMemo(() => {
    return storeData.products.filter((product) => product.active).reduce<Record<string, number>>((acc, product) => {
      acc[product.categoryId] = (acc[product.categoryId] ?? 0) + 1;
      return acc;
    }, {});
  }, [storeData.products]);

  const brandCounts = useMemo(() => {
    return storeData.products
      .filter((product) => product.active && (!selectedCategoryId || product.categoryId === selectedCategoryId))
      .reduce<Record<string, number>>((acc, product) => {
        acc[product.brandId] = (acc[product.brandId] ?? 0) + 1;
        return acc;
      }, {});
  }, [selectedCategoryId, storeData.products]);

  const visibleBrands = useMemo(
    () => activeBrands.filter((brand) => (brandCounts[brand.id] ?? 0) > 0),
    [activeBrands, brandCounts]
  );

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

    if (selectedCategoryId) {
      result = result.filter((product) => product.categoryId === selectedCategoryId);
    }

    if (selectedBrands.length) {
      result = result.filter((product) => selectedBrands.includes(product.brandId));
    }

    if (sortBy === "price-desc") {
      result = [...result].sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
    } else if (sortBy === "price-asc") {
      result = [...result].sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
    } else {
      result = [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    return result;
  }, [searchQuery, selectedBrands, selectedCategoryId, sortBy, storeData.products]);

  const activeFilterLabels = useMemo(() => {
    return selectedBrands
      .map((id) => activeBrands.find((brand) => brand.id === id))
      .filter(Boolean)
      .map((brand) => ({ id: brand!.id, label: textByLanguage(language, brand!.nameAr, brand!.nameHe) }));
  }, [activeBrands, language, selectedBrands]);

  function selectCategory(id: string) {
    const next = selectedCategoryId === id ? "" : id;
    setSelectedCategoryId(next);
    setSelectedBrands([]);
    pushFilters(next, []);
  }

  function toggleBrand(id: string) {
    const next = selectedBrands.includes(id) ? selectedBrands.filter((item) => item !== id) : [...selectedBrands, id];
    setSelectedBrands(next);
    pushFilters(selectedCategoryId, next);
  }

  function resetBrands() {
    setSelectedBrands([]);
    pushFilters(selectedCategoryId, []);
  }

  function resetAll() {
    setSelectedBrands([]);
    setSortBy("newest");
    const category = searchParams?.get("category") || "";
    setSelectedCategoryId(category);
    pushFilters(category, []);
  }

  function handleAddToCart(product: Product) {
    const color = storeData.colors.find((entry) => entry.productId === product.id && entry.stockQuantity > 0);
    if (!color) return;
    addToCart(product.id, color.id, 1);
    window.dispatchEvent(new CustomEvent("flora-open-cart"));
  }

  const pageTitle = currentCategory
    ? textByLanguage(language, currentCategory.nameAr, currentCategory.nameHe)
    : labels.titleAll;

  const pageBody = currentCategory
    ? textByLanguage(language, currentCategory.descriptionAr, currentCategory.descriptionHe)
    : labels.bodyAll;

  const filterPanel = (
    <ShopFilterPanel
      activeBrands={visibleBrands}
      brandCounts={brandCounts}
      brandTitle={currentCategory ? `${labels.brands} · ${textByLanguage(language, currentCategory.nameAr, currentCategory.nameHe)}` : labels.brands}
      labels={labels}
      language={language}
      onClose={() => setMobileFiltersOpen(false)}
      resetFilters={resetBrands}
      selectedBrands={selectedBrands}
      toggleBrand={toggleBrand}
    />
  );

  return (
    <>
      <Header />
      <main className="shop-page flora-shop-page" dir="rtl">
        <section className="shop-hero">
          <p className="luxury-kicker">{labels.eyebrow}</p>
          <h1>{pageTitle}</h1>
          <p>{pageBody}</p>
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
            ) : null}
          </div>
        </section>

        {!selectedCategoryId ? (
          <section className="shop-category-strip flora-shop-categories">
            <div className="shop-category-strip__head">
              <div>
                <span>{labels.pickCategory}</span>
                <p>{labels.pickCategoryBody}</p>
              </div>
            </div>
            <div className="shop-category-strip__grid">
              {activeCategories.map((category) => (
                <button className="" key={category.id} onClick={() => selectCategory(category.id)} type="button">
                  <Image src={category.imageUrl} alt={textByLanguage(language, category.nameAr, category.nameHe)} fill sizes="(max-width: 900px) 50vw, 20vw" />
                  <span>{textByLanguage(language, category.nameAr, category.nameHe)}</span>
                  <small>{categoryCounts[category.id] ?? 0}</small>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="shop-category-tabs">
            {activeCategories.map((category) => (
              <button
                className={selectedCategoryId === category.id ? "is-active" : ""}
                key={category.id}
                onClick={() => selectCategory(category.id)}
                type="button"
              >
                {textByLanguage(language, category.nameAr, category.nameHe)}
              </button>
            ))}
          </section>
        )}

        {visibleBrands.length ? (
          <section className="brand-filter-bar flora-brand-filter-bar">
            <button className={!selectedBrands.length ? "is-active" : ""} onClick={resetBrands} type="button">
              {labels.allBrands}
            </button>
            {visibleBrands.map((brand) => (
              <button
                className={selectedBrands.includes(brand.id) ? "is-active" : ""}
                key={brand.id}
                onClick={() => toggleBrand(brand.id)}
                type="button"
              >
                {brand.logoUrl ? <Image src={brand.logoUrl} alt={textByLanguage(language, brand.nameAr, brand.nameHe)} width={82} height={28} /> : null}
                <span>{textByLanguage(language, brand.nameAr, brand.nameHe)}</span>
                <small>{brandCounts[brand.id] ?? 0}</small>
              </button>
            ))}
          </section>
        ) : null}

        <div className="shop-shell">
          <aside className="shop-sidebar">{filterPanel}</aside>

          <section className="shop-main">
            <div className="shop-toolbar">
              <div>
                <span>{labels.matching}</span>
                <h2>{pageTitle}</h2>
                <p className="shop-toolbar__count">
                  {filteredProducts.length} {labels.results}
                </p>
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
                {selectedCategoryId ? (
                  <button className="shop-mobile-filter-trigger" onClick={() => setMobileFiltersOpen(true)} type="button">
                    <SlidersHorizontal size={16} />
                    {labels.filters}
                  </button>
                ) : null}
                {selectedBrands.length ? (
                  <button className="shop-reset shop-reset--ghost" onClick={resetBrands} type="button">
                    <RotateCcw size={15} />
                    {labels.clearAll}
                  </button>
                ) : null}
              </div>
            </div>

            {activeFilterLabels.length ? (
              <div className="shop-active-filters">
                <span>{labels.activeFilters}</span>
                <div>
                  {activeFilterLabels.map((filter) => (
                    <button key={filter.id} onClick={() => toggleBrand(filter.id)} type="button">
                      {filter.label}
                      <X size={12} />
                    </button>
                  ))}
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
                    <ProductCard
                      addLabel={labels.add}
                      key={product.id}
                      language={language}
                      onAdd={handleAddToCart}
                      product={product}
                      soldOutLabel={labels.soldOut}
                      stock={stock}
                      viewLabel={labels.view}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="shop-empty">
                <strong>{labels.noProducts}</strong>
                <button className="shop-reset" onClick={resetAll} type="button">
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
  brandCounts,
  brandTitle,
  labels,
  language,
  onClose,
  resetFilters,
  selectedBrands,
  toggleBrand
}: {
  activeBrands: Array<{ id: string; nameAr: string; nameHe: string }>;
  brandCounts: Record<string, number>;
  brandTitle: string;
  labels: ShopLabels;
  language: Language;
  onClose?: () => void;
  resetFilters: () => void;
  selectedBrands: string[];
  toggleBrand: (id: string) => void;
}) {
  return (
    <div className="shop-filter-panel">
      <div className="shop-sidebar__head">
        <h2>{brandTitle}</h2>
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
        <div className="shop-filter-list">
          <label className="shop-check">
            <input checked={!selectedBrands.length} onChange={resetFilters} type="checkbox" />
            <em />
            <div>
              <strong>{labels.allBrands}</strong>
            </div>
          </label>
          {activeBrands.map((brand) => (
            <label className="shop-check" key={brand.id}>
              <input checked={selectedBrands.includes(brand.id)} onChange={() => toggleBrand(brand.id)} type="checkbox" />
              <em />
              <div>
                <strong>{textByLanguage(language, brand.nameAr, brand.nameHe)}</strong>
                <small>{brandCounts[brand.id] ?? 0}</small>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
