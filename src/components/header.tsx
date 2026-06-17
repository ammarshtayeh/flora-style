"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  Globe2,
  LayoutDashboard,
  Menu,
  Minus,
  Moon,
  Plus,
  Search,
  ShoppingBag,
  SunMedium,
  Trash2,
  X
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { CartItem, changeCartColor, clearCart, getCart, removeFromCart, subscribeToCart, updateCartQty } from "@/lib/cart";
import { loadStoreData, subscribeToStoreData } from "@/lib/db";
import { formatPrice, initialStoreData, Language, textByLanguage } from "@/lib/store";

const headerCopy = {
  ar: {
    searchPlaceholder: "ابحثي عن حقيبة، ساعة، لون أو ماركة...",
    cart: "السلة",
    empty: "السلة فارغة",
    checkoutBtn: "إتمام الطلب",
    subtotal: "المجموع",
    admin: "الأدمن",
    all: "الكل",
    clearCart: "تفريغ السلة",
    remove: "إزالة",
    addedToCart: "أضيف إلى السلة",
    filters: "التصنيفات",
    browseAll: "كل المنتجات",
    search: "بحث",
    language: "اللغة",
    theme: "الوضع",
    light: "فاتح",
    dark: "داكن",
    concierge: "تسوق فاخر عبر واتساب",
    cartHint: "راجعي القطع قبل الانتقال لإتمام الطلب.",
    menuShop: "التسوق",
    menuSettings: "الإعدادات",
    menuHome: "الرئيسية",
    menuBags: "الشنط",
    menuWatches: "الساعات"
  },
  he: {
    searchPlaceholder: "חפשי תיק, שעון, צבע או מותג...",
    cart: "עגלה",
    empty: "העגלה ריקה",
    checkoutBtn: "השלמת הזמנה",
    subtotal: "סכום ביניים",
    admin: "ניהול",
    all: "הכל",
    clearCart: "ריקון עגלה",
    remove: "הסרה",
    addedToCart: "נוסף לעגלה",
    filters: "קטגוריות",
    browseAll: "כל המוצרים",
    search: "חיפוש",
    language: "שפה",
    theme: "ערכת צבע",
    light: "בהיר",
    dark: "כהה",
    concierge: "קנייה יוקרתית בוואטסאפ",
    cartHint: "בדקי את הפריטים לפני המשך ההזמנה.",
    menuShop: "קנייה",
    menuSettings: "הגדרות",
    menuHome: "בית",
    menuBags: "תיקים",
    menuWatches: "שעונים"
  }
};

function HeaderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [storeData, setStoreData] = useState(initialStoreData);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("ar");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const labels = headerCopy[language];

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLang = window.localStorage.getItem("flora-language") as Language;
      if (savedLang === "ar" || savedLang === "he") {
        setLanguage(savedLang);
        document.documentElement.dir = "rtl";
        document.documentElement.lang = savedLang;
      }

      const savedTheme = window.localStorage.getItem("flora-theme");
      const nextTheme = savedTheme === "light" ? "light" : "dark";
      setTheme(nextTheme);
      document.documentElement.dataset.theme = nextTheme;
    }

    setStoreData(loadStoreData());
    setCart(getCart());
    const unsubStore = subscribeToStoreData(setStoreData);
    const unsubCart = subscribeToCart(setCart);
    const handleOpenCart = () => setCartOpen(true);
    let toastTimer: ReturnType<typeof setTimeout>;

    const handleCartAdded = (event: Event) => {
      const productId = (event as CustomEvent).detail as string;
      const product = loadStoreData().products.find((item) => item.id === productId);
      if (!product) return;
      const lang = (window.localStorage.getItem("flora-language") as Language) || "ar";
      setToast(lang === "ar" ? product.nameAr : product.nameHe);
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => setToast(null), 2500);
    };

    window.addEventListener("flora-open-cart", handleOpenCart);
    window.addEventListener("flora-cart-added", handleCartAdded);

    return () => {
      unsubStore();
      unsubCart();
      window.removeEventListener("flora-open-cart", handleOpenCart);
      window.removeEventListener("flora-cart-added", handleCartAdded);
      clearTimeout(toastTimer);
    };
  }, []);

  useEffect(() => {
    setSearchQuery(searchParams?.get("search") || "");
  }, [searchParams]);

  const cartDetails = useMemo(() => {
    return cart
      .map((item) => {
        const product = storeData.products.find((entry) => entry.id === item.productId);
        const color = storeData.colors.find((entry) => entry.id === item.colorId);
        if (!product || !color) return null;
        const price = product.salePrice ?? product.price;
        return {
          ...item,
          product,
          color,
          price,
          total: price * item.quantity,
          availableColors: storeData.colors.filter((entry) => entry.productId === product.id && entry.stockQuantity > 0)
        };
      })
      .filter(Boolean);
  }, [cart, storeData]);

  const subtotal = cartDetails.reduce((sum, item) => sum + (item?.total ?? 0), 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const activeCategories = useMemo(() => storeData.categories.filter((category) => category.active), [storeData.categories]);
  const bagsCategory = useMemo(() => activeCategories.find((category) => category.slug === "handbags"), [activeCategories]);
  const watchesCategory = useMemo(() => activeCategories.find((category) => category.slug === "watches"), [activeCategories]);

  function handleLanguageSwitch() {
    const nextLang = language === "ar" ? "he" : "ar";
    setLanguage(nextLang);
    window.localStorage.setItem("flora-language", nextLang);
    document.documentElement.dir = "rtl";
    document.documentElement.lang = nextLang;
    window.dispatchEvent(new CustomEvent("flora-language-changed", { detail: nextLang }));
  }

  function handleThemeSwitch() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem("flora-theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    const query = searchQuery.trim();
    router.push(query ? `/shop?search=${encodeURIComponent(query)}` : "/shop");
  }

  return (
    <>
      <header className="luxury-command">
        <div className="luxury-command__top">
          <Link className="luxury-brand" href="/" aria-label="Flora Style home">
            <Image src="/flora-logo.png" alt="Flora Style" width={46} height={46} priority />
            <span>Flora Style</span>
          </Link>

          <form className="luxury-search" onSubmit={handleSearchSubmit} role="search">
            <Search aria-hidden="true" size={18} />
            <input
              aria-label={labels.search}
              placeholder={labels.searchPlaceholder}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <button type="submit">{labels.search}</button>
          </form>

          <div className="luxury-command__actions">
            <button
              className="luxury-icon-action luxury-icon-action--mobile-only"
              onClick={() => setMenuOpen(true)}
              aria-label={labels.filters}
              aria-expanded={menuOpen}
            >
              <Menu size={18} />
            </button>
            <button className="luxury-icon-action luxury-icon-action--desktop-only" onClick={handleLanguageSwitch} aria-label={labels.language}>
              <Globe2 size={18} />
              <span>{language === "ar" ? "עברית" : "العربية"}</span>
            </button>
            <button className="luxury-icon-action luxury-icon-action--desktop-only" onClick={handleThemeSwitch} aria-label={labels.theme}>
              {theme === "dark" ? <SunMedium size={18} /> : <Moon size={18} />}
              <span>{theme === "dark" ? labels.light : labels.dark}</span>
            </button>
            <button className="luxury-cart-trigger" onClick={() => setCartOpen(true)} aria-label={labels.cart}>
              <ShoppingBag size={19} />
              <span>{labels.cart}</span>
              <b>{cartItemsCount}</b>
            </button>
            <Link className="luxury-icon-link luxury-icon-link--admin luxury-icon-action--desktop-only" href="/admin" aria-label={labels.admin}>
              <LayoutDashboard size={18} />
              <span>{labels.admin}</span>
            </Link>
          </div>
        </div>

        <nav className="luxury-category-ribbon" aria-label={labels.filters}>
          <span>{labels.filters}</span>
          <div className="luxury-category-ribbon__links">
            <Link className={searchParams?.get("category") ? "" : "is-active"} href="/shop">
              {labels.menuShop}
            </Link>
            {bagsCategory ? (
              <Link className={searchParams?.get("category") === bagsCategory.id ? "is-active" : ""} href={`/shop?category=${bagsCategory.id}`}>
                {labels.menuBags}
              </Link>
            ) : null}
            {watchesCategory ? (
              <Link className={searchParams?.get("category") === watchesCategory.id ? "is-active" : ""} href={`/shop?category=${watchesCategory.id}`}>
                {labels.menuWatches}
              </Link>
            ) : null}
            <Link className={!searchParams?.get("category") ? "is-active" : ""} href="/shop">
              {labels.all}
            </Link>
            {activeCategories.map((category) => (
              <Link
                className={searchParams?.get("category") === category.id ? "is-active" : ""}
                href={`/shop?category=${category.id}`}
                key={category.id}
              >
                {textByLanguage(language, category.nameAr, category.nameHe)}
              </Link>
            ))}
          </div>
        </nav>

        <div className="luxury-mobile-categories" aria-label={labels.filters}>
          <Link className={!searchParams?.get("category") ? "is-active" : ""} href="/shop">
            {labels.all}
          </Link>
          {activeCategories.map((category) => (
            <Link
              className={searchParams?.get("category") === category.id ? "is-active" : ""}
              href={`/shop?category=${category.id}`}
              key={category.id}
            >
              {textByLanguage(language, category.nameAr, category.nameHe)}
            </Link>
          ))}
        </div>


      </header>

      <div className="luxury-command-spacer" />

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="mobile-menu-overlay"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={() => setMenuOpen(false)}
          >
            <motion.aside
              animate={{ x: 0 }}
              className="mobile-menu-sheet"
              exit={{ x: "100%" }}
              initial={{ x: "100%" }}
              onClick={(event) => event.stopPropagation()}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mobile-menu-sheet__head">
                <div>
                  <span>{labels.concierge}</span>
                  <h2>Flora Style</h2>
                </div>
                <button onClick={() => setMenuOpen(false)} aria-label="Close menu">
                  <X size={20} />
                </button>
              </div>

              <Link className="mobile-menu-home" href="/" onClick={() => setMenuOpen(false)}>
                <ArrowLeft size={18} />
                {labels.menuHome}
              </Link>

              <div className="mobile-menu-section">
                <span>{labels.filters}</span>
                <nav className="mobile-menu-links" aria-label={labels.filters}>
                  {bagsCategory ? (
                    <Link href={`/shop?category=${bagsCategory.id}`} onClick={() => setMenuOpen(false)}>
                      <span>{labels.menuBags}</span>
                      <ChevronLeft size={18} />
                    </Link>
                  ) : null}
                  {watchesCategory ? (
                    <Link href={`/shop?category=${watchesCategory.id}`} onClick={() => setMenuOpen(false)}>
                      <span>{labels.menuWatches}</span>
                      <ChevronLeft size={18} />
                    </Link>
                  ) : null}
                </nav>
              </div>

              <div className="mobile-menu-section">
                <span>{labels.menuShop}</span>
                <nav className="mobile-menu-links" aria-label={labels.filters}>
                  <Link href="/shop" onClick={() => setMenuOpen(false)}>
                    <span>{labels.browseAll}</span>
                    <ChevronLeft size={18} />
                  </Link>
                  {activeCategories.map((category) => (
                    <Link href={`/shop?category=${category.id}`} key={category.id} onClick={() => setMenuOpen(false)}>
                      <span>{textByLanguage(language, category.nameAr, category.nameHe)}</span>
                      <ChevronLeft size={18} />
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="mobile-menu-section">
                <span>{labels.menuSettings}</span>
                <div className="mobile-menu-actions">
                  <button onClick={handleLanguageSwitch} type="button">
                    <Globe2 size={18} />
                    <span>{language === "ar" ? "עברית" : "العربية"}</span>
                  </button>
                  <button onClick={handleThemeSwitch} type="button">
                    {theme === "dark" ? <SunMedium size={18} /> : <Moon size={18} />}
                    <span>{theme === "dark" ? labels.light : labels.dark}</span>
                  </button>
                  <Link href="/admin" onClick={() => setMenuOpen(false)}>
                    <LayoutDashboard size={18} />
                    <span>{labels.admin}</span>
                  </Link>
                </div>
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {cartOpen ? (
          <motion.aside
            className="cart-sheet"
            initial={{ opacity: 0, y: 64 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 64 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="cart-sheet__head">
              <div>
                <span>{labels.concierge}</span>
                <h2>{labels.cart}</h2>
                <p>{labels.cartHint}</p>
              </div>
              <button onClick={() => setCartOpen(false)} aria-label="Close cart">
                <X size={20} />
              </button>
            </div>

            {cartDetails.length ? (
              <>
                <button className="clear-cart-trigger" onClick={clearCart}>
                  <Trash2 size={15} />
                  {labels.clearCart}
                </button>

                <div className="cart-lines">
                  {cartDetails.map((item) =>
                    item ? (
                      <div className="cart-line" key={`${item.productId}-${item.colorId}`}>
                        <Image
                          src={item.product.images[0]}
                          alt={textByLanguage(language, item.product.nameAr, item.product.nameHe)}
                          width={68}
                          height={82}
                        />
                        <div>
                          <strong>{textByLanguage(language, item.product.nameAr, item.product.nameHe)}</strong>
                          <select
                            className="cart-color-select"
                            value={item.colorId}
                            onChange={(event) => changeCartColor(item.productId, item.colorId, event.target.value)}
                          >
                            {item.availableColors.map((color) => (
                              <option key={color.id} value={color.id}>
                                {textByLanguage(language, color.nameAr, color.nameHe)}
                              </option>
                            ))}
                          </select>
                          <div className="qty-control">
                            <button onClick={() => updateCartQty(item.productId, item.colorId, item.quantity - 1)}>
                              <Minus size={14} />
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              onClick={() => updateCartQty(item.productId, item.colorId, item.quantity + 1)}
                              disabled={item.quantity >= item.color.stockQuantity}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <button className="cart-line-remove" onClick={() => removeFromCart(item.productId, item.colorId)}>
                            <Trash2 size={13} />
                            {labels.remove}
                          </button>
                        </div>
                        <b>{formatPrice(item.total)}</b>
                      </div>
                    ) : null
                  )}
                </div>

                <div className="cart-checkout-panel">
                  <div className="cart-total cart-total--grand">
                    <span>{labels.subtotal}</span>
                    <b>{formatPrice(subtotal)}</b>
                  </div>
                  <button
                    onClick={() => {
                      setCartOpen(false);
                      router.push("/checkout");
                    }}
                  >
                    <CheckCircle2 size={18} />
                    {labels.checkoutBtn}
                  </button>
                </div>
              </>
            ) : (
              <p className="cart-empty">{labels.empty}</p>
            )}
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {toast ? (
          <motion.div
            className="cart-toast"
            initial={{ opacity: 0, y: 40, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <CheckCircle2 size={18} />
            <span>{labels.addedToCart}</span>
            <strong>{toast}</strong>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export function Header() {
  return (
    <Suspense fallback={<div className="luxury-command-spacer" />}>
      <HeaderInner />
    </Suspense>
  );
}


