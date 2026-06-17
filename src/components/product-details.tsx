"use client";

import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, CheckCircle2, Copy, Expand, Minus, Palette, Plus, Send, Share2, ShoppingBag, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/header";
import { ProductCard } from "@/components/product-card";
import { addToCart } from "@/lib/cart";
import { loadStoreData, subscribeToStoreData } from "@/lib/db";
import { formatPrice, initialStoreData, Language, Product, ProductColor, textByLanguage } from "@/lib/store";

type ProductDetailsProps = {
  product: Product;
  brandNameAr: string;
  brandNameHe: string;
  categoryNameAr: string;
  categoryNameHe: string;
  initialColors: ProductColor[];
  formattedPrice: string;
  arName: string;
};

const productCopy = {
  ar: {
    back: "العودة للمتجر",
    sku: "رمز المنتج",
    brand: "البراند",
    category: "التصنيف",
    availability: "التوفر",
    color: "اختيار اللون",
    quantity: "الكمية",
    add: "إضافة للسلة",
    whatsapp: "شراء عبر واتساب",
    share: "مشاركة المنتج",
    description: "الوصف",
    story: "قصة المنتج",
    related: "منتجات مرتبطة",
    recently: "شوهدت مؤخراً",
    available: "متوفر",
    only: "متبقي فقط",
    out: "غير متوفر",
    pieces: "قطعة",
    copied: "تم نسخ الرابط",
    zoom: "تكبير الصورة",
    checkoutHint: "اختاري اللون والكمية قبل الإضافة للسلة."
  },
  he: {
    back: "חזרה לחנות",
    sku: "מק״ט",
    brand: "מותג",
    category: "קטגוריה",
    availability: "זמינות",
    color: "בחירת צבע",
    quantity: "כמות",
    add: "הוספה לעגלה",
    whatsapp: "קנייה בוואטסאפ",
    share: "שיתוף מוצר",
    description: "תיאור",
    story: "סיפור המוצר",
    related: "מוצרים קשורים",
    recently: "נצפו לאחרונה",
    available: "זמין",
    only: "נותרו רק",
    out: "אזל מהמלאי",
    pieces: "יחידות",
    copied: "הקישור הועתק",
    zoom: "הגדלת תמונה",
    checkoutHint: "בחרי צבע וכמות לפני ההוספה לעגלה."
  }
};

export function ProductDetails({ product: staticProduct }: ProductDetailsProps) {
  const [language, setLanguage] = useState<Language>("ar");
  const [activeImage, setActiveImage] = useState(0);
  const [storeData, setStoreData] = useState(initialStoreData);
  const [selectedColorId, setSelectedColorId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [shareState, setShareState] = useState("");
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const labels = productCopy[language];

  useEffect(() => {
    setStoreData(loadStoreData());
    return subscribeToStoreData(setStoreData);
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("flora-language") as Language;
    if (saved === "ar" || saved === "he") setLanguage(saved);
    const handleLangChange = (event: Event) => setLanguage((event as CustomEvent<Language>).detail);
    window.addEventListener("flora-language-changed", handleLangChange);
    return () => window.removeEventListener("flora-language-changed", handleLangChange);
  }, []);

  const product = useMemo(() => storeData.products.find((item) => item.id === staticProduct.id) || staticProduct, [storeData.products, staticProduct]);
  const brand = useMemo(() => storeData.brands.find((item) => item.id === product.brandId), [storeData.brands, product.brandId]);
  const category = useMemo(() => storeData.categories.find((item) => item.id === product.categoryId), [storeData.categories, product.categoryId]);
  const colors = useMemo(() => storeData.colors.filter((color) => color.productId === product.id), [storeData.colors, product.id]);

  useEffect(() => {
    if (colors.length > 0 && !selectedColorId) {
      const available = colors.find((color) => color.stockQuantity > 0);
      setSelectedColorId(available?.id ?? colors[0].id);
    }
  }, [colors, selectedColorId]);

  const selectedColor = colors.find((color) => color.id === selectedColorId) ?? colors[0];
  const maxStock = selectedColor?.stockQuantity ?? 0;

  useEffect(() => {
    if (quantity > maxStock) setQuantity(maxStock > 0 ? maxStock : 1);
  }, [maxStock, quantity]);

  useEffect(() => {
    const raw = window.localStorage.getItem("flora-recently-viewed");
    const current = raw ? (JSON.parse(raw) as string[]) : [];
    const next = [product.slug, ...current.filter((slug) => slug !== product.slug)].slice(0, 6);
    window.localStorage.setItem("flora-recently-viewed", JSON.stringify(next));
    setRecentSlugs(next.filter((slug) => slug !== product.slug));
  }, [product.slug]);

  const recentlyViewed = useMemo(
    () => recentSlugs.map((slug) => storeData.products.find((item) => item.slug === slug && item.active)).filter(Boolean) as Product[],
    [recentSlugs, storeData.products]
  );

  const related = useMemo(() => {
    const activeProducts = storeData.products.filter((item) => item.active);
    const relatedItems = activeProducts.filter(
      (candidate) => candidate.id !== product.id && (candidate.categoryId === product.categoryId || candidate.brandId === product.brandId)
    );
    const filler = activeProducts.filter((candidate) => candidate.id !== product.id && !relatedItems.some((item) => item.id === candidate.id));
    return [...relatedItems, ...filler].slice(0, 4);
  }, [storeData.products, product]);

  function inventoryLabel(stock: number) {
    if (stock <= 0) return labels.out;
    if (stock <= 3) return `${labels.only} ${stock}`;
    return `${labels.available}: ${stock} ${labels.pieces}`;
  }

  function handleSetColor(color: ProductColor) {
    setSelectedColorId(color.id);
    setQuantity(1);
  }

  function handleAddToCart() {
    if (!selectedColorId || maxStock <= 0) return;
    addToCart(product.id, selectedColorId, quantity);
    window.dispatchEvent(new CustomEvent("flora-open-cart"));
  }

  function buyViaWhatsApp() {
    const url = window.location.href;
    const message = [
      "Flora Style Product Order",
      `${labels.brand}: ${brand ? textByLanguage(language, brand.nameAr, brand.nameHe) : "Flora Style"}`,
      `${labels.sku}: ${product.sku}`,
      `${textByLanguage(language, product.nameAr, product.nameHe)}`,
      `${labels.color}: ${selectedColor ? textByLanguage(language, selectedColor.nameAr, selectedColor.nameHe) : "-"}`,
      `${labels.quantity}: ${quantity}`,
      `${formatPrice(product.salePrice ?? product.price)}`,
      url
    ].join("\n");
    window.open(`https://wa.me/${storeData.settings.whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  async function shareProduct() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: textByLanguage(language, product.nameAr, product.nameHe), text: product.descriptionAr, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    setShareState(labels.copied);
    window.setTimeout(() => setShareState(""), 1800);
  }

  return (
    <>
      <Header />
      <main className="product-page" dir="rtl">
        <div className="product-breadcrumb">
          <Link href="/">
            <ArrowRight size={18} />
            {labels.back}
          </Link>
          <span>{category ? textByLanguage(language, category.nameAr, category.nameHe) : "Flora Style"}</span>
        </div>

        <section className="product-landing" ref={heroRef}>
          <div className="product-gallery">
            <motion.button className="product-gallery__main" style={{ y: imageY }} onClick={() => setViewerOpen(true)} aria-label={labels.zoom}>
              <AnimatePresence mode="wait">
                {product.images[activeImage] ? (
                  <motion.span
                    key={product.images[activeImage]}
                    initial={{ opacity: 0, scale: 1.03 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.55 }}
                  >
                    <Image src={product.images[activeImage]} alt={textByLanguage(language, product.nameAr, product.nameHe)} fill priority sizes="(max-width: 900px) 100vw, 58vw" />
                    <i className="gallery-zoom">
                      <Expand size={18} />
                    </i>
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </motion.button>

            <div className="product-thumbs">
              {product.images.map((image, index) => (
                <button className={activeImage === index ? "is-active" : ""} key={image} onClick={() => setActiveImage(index)}>
                  <Image src={image} alt="" fill sizes="96px" />
                </button>
              ))}
            </div>
          </div>

          <motion.aside className="purchase-panel" initial={{ opacity: 0, y: 34 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }}>
            <p className="luxury-kicker">{brand ? textByLanguage(language, brand.nameAr, brand.nameHe) : "Flora Style"}</p>
            <h1>{textByLanguage(language, product.nameAr, product.nameHe)}</h1>
            <p className="purchase-hint">{labels.checkoutHint}</p>

            <div className="product-price">
              <strong>{formatPrice(product.salePrice ?? product.price)}</strong>
              {product.salePrice ? <span>{formatPrice(product.price)}</span> : null}
            </div>

            <dl className="product-facts">
              <div>
                <dt>{labels.sku}</dt>
                <dd>{product.sku}</dd>
              </div>
              <div>
                <dt>{labels.category}</dt>
                <dd>{category ? textByLanguage(language, category.nameAr, category.nameHe) : "-"}</dd>
              </div>
              <div>
                <dt>{labels.availability}</dt>
                <dd>{inventoryLabel(maxStock)}</dd>
              </div>
            </dl>

            <div className="selector-block">
              <span>
                <Palette size={15} />
                {labels.color}
              </span>
              <div className="premium-swatches">
                {colors.map((color) => (
                  <button className={color.id === selectedColorId ? "is-selected" : ""} key={color.id} onClick={() => handleSetColor(color)}>
                    <i style={{ background: color.value }} />
                    <span>{textByLanguage(language, color.nameAr, color.nameHe)}</span>
                    <small>{inventoryLabel(color.stockQuantity)}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="selector-block">
              <span>{labels.quantity}</span>
              <div className="luxury-qty">
                <button onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity <= 1 || maxStock <= 0}>
                  <Minus size={15} />
                </button>
                <strong>{maxStock > 0 ? quantity : 0}</strong>
                <button onClick={() => setQuantity((value) => Math.min(maxStock, value + 1))} disabled={quantity >= maxStock || maxStock <= 0}>
                  <Plus size={15} />
                </button>
              </div>
            </div>

            <div className="purchase-actions">
              <button disabled={maxStock <= 0} onClick={handleAddToCart}>
                <ShoppingBag size={18} />
                {labels.add}
              </button>
              <button disabled={maxStock <= 0} onClick={buyViaWhatsApp}>
                <Send size={18} />
                {labels.whatsapp}
              </button>
            </div>
            <button className="share-link" onClick={shareProduct}>
              {shareState ? <Copy size={16} /> : <Share2 size={16} />}
              {shareState || labels.share}
            </button>
          </motion.aside>
        </section>

        <section className="product-story">
          <span>{labels.story}</span>
          <h2>{labels.description}</h2>
          <p>{textByLanguage(language, product.storyAr, product.storyHe)}</p>
        </section>

        <ProductRow title={labels.related} products={related} colors={storeData.colors} language={language} />
        {recentlyViewed.length ? <ProductRow title={labels.recently} products={recentlyViewed} colors={storeData.colors} language={language} /> : null}

        <AnimatePresence>
          {viewerOpen && product.images[activeImage] ? (
            <motion.div className="image-viewer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button onClick={() => setViewerOpen(false)} aria-label="Close image">
                <X size={24} />
              </button>
              <Image src={product.images[activeImage]} alt={textByLanguage(language, product.nameAr, product.nameHe)} fill sizes="100vw" />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
    </>
  );
}

function ProductRow({
  title,
  products,
  colors,
  language,
}: {
  title: string;
  products: Product[];
  colors: ProductColor[];
  language: Language;
}) {
  return (
    <section className="product-row">
      <h2>{title}</h2>
      <div className="product-row__grid">
        {products.map((product) => {
          const stock = colors.filter((color) => color.productId === product.id).reduce((sum, color) => sum + color.stockQuantity, 0);
          return (
            <ProductCard
              addLabel={language === "ar" ? "إضافة" : "הוספה"}
              compact
              key={product.id}
              language={language}
              product={product}
              soldOutLabel={language === "ar" ? "نفد" : "אזל"}
              stock={stock}
              viewLabel={language === "ar" ? "عرض" : "צפי"}
            />
          );
        })}
      </div>
    </section>
  );
}
