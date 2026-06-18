"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
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
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  CartItem,
  changeCartColor,
  clearCart,
  getCart,
  removeFromCart,
  subscribeToCart,
  updateCartQty,
} from "@/lib/cart";
import { loadStoreData, subscribeToStoreData } from "@/lib/db";
import { formatPrice, initialStoreData, Language, textByLanguage } from "@/lib/store";
import { StoreContactLinks } from "@/components/store-contact-links";

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
    concierge: "اطلبي مباشرة من الموقع",
    cartHint: "راجعي القطع ثم أكملي الطلب من الموقع.",
    menuShop: "التسوق",
    menuSettings: "الإعدادات",
    menuHome: "الرئيسية",
    menuBags: "الشنط",
    menuWatches: "الساعات",
    contact: "تواصل معنا"
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
    concierge: "הזמנה ישירה דרך האתר",
    cartHint: "בדקי את הפריטים ואז השלימי את ההזמנה דרך האתר.",
    menuShop: "קנייה",
    menuSettings: "הגדרות",
    menuHome: "בית",
    menuBags: "תיקים",
    menuWatches: "שעונים",
    contact: "יצירת קשר"
  }
};

function HeaderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const headerRef = useRef<HTMLElement>(null);
  const [storeData, setStoreData] = useState(initialStoreData);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("ar");
  const [theme, setTheme] = useState<"dark" | "light">("light");
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
      const nextTheme = savedTheme === "dark" ? "dark" : "light";
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

  useEffect(() => {
    const node = headerRef.current;
    if (!node) return;

    const updateHeaderHeight = () => {
      document.documentElement.style.setProperty("--flora-header-height", `${Math.ceil(node.getBoundingClientRect().height)}px`);
    };

    updateHeaderHeight();
    const observer = new ResizeObserver(updateHeaderHeight);
    observer.observe(node);
    window.addEventListener("resize", updateHeaderHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeaderHeight);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const shouldLock = cartOpen || menuOpen;
    const previousOverflow = document.body.style.overflow;
    if (shouldLock) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [cartOpen, menuOpen]);

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
  const [cartPanelAxis, setCartPanelAxis] = useState<"x" | "y">("y");
  const [cartPanelDirection, setCartPanelDirection] = useState(1);

  useEffect(() => {
    const updateCartPanelMotion = () => {
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      const rtl = document.documentElement.dir === "rtl";
      setCartPanelAxis(mobile ? "y" : "x");
      setCartPanelDirection(mobile ? 1 : rtl ? -1 : 1);
    };

    updateCartPanelMotion();
    window.addEventListener("resize", updateCartPanelMotion);
    return () => window.removeEventListener("resize", updateCartPanelMotion);
  }, [language]);
  const activeCategoryId = searchParams?.get("category") || "";

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
      <header className="flora-header" ref={headerRef}>
        <div className="flora-header__top">
          <button
            aria-expanded={menuOpen}
            aria-label={labels.filters}
            className="flora-header__menu"
            onClick={() => setMenuOpen(true)}
            type="button"
          >
            <Menu size={18} />
          </button>

          <Link className="flora-header__brand" href="/" aria-label="Flora Style home">
            <Image src="/flora-logo.png" alt="Flora Style" width={44} height={44} priority />
            <div>
              <strong>Flora Style</strong>
              <span>Luxury Curated Store</span>
            </div>
          </Link>

          <form className="flora-header__search" onSubmit={handleSearchSubmit} role="search">
            <Search aria-hidden="true" size={18} />
            <input
              aria-label={labels.search}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={labels.searchPlaceholder}
              value={searchQuery}
            />
            <button type="submit">{labels.search}</button>
          </form>

          <div className="flora-header__actions">
            <button className="flora-header__action desktop-only" onClick={handleLanguageSwitch} type="button">
              <Globe2 size={16} />
              <span>{language === "ar" ? "עברית" : "العربية"}</span>
            </button>
            <button className="flora-header__action desktop-only" onClick={handleThemeSwitch} type="button">
              {theme === "dark" ? <SunMedium size={16} /> : <Moon size={16} />}
              <span>{theme === "dark" ? labels.light : labels.dark}</span>
            </button>
            <Link className="flora-header__action desktop-only" href="/admin/login">
              <LayoutDashboard size={16} />
              <span>{labels.admin}</span>
            </Link>
          </div>

          <button
            aria-expanded={cartOpen}
            aria-haspopup="dialog"
            className="flora-header__cart"
            onClick={() => setCartOpen(true)}
            type="button"
          >
            <ShoppingBag size={18} />
            <span>{labels.cart}</span>
            <b>{cartItemsCount}</b>
          </button>
        </div>

        <div className="flora-header__nav">
          <Link className={!activeCategoryId ? "is-active" : ""} href="/shop">
            {labels.all}
          </Link>
          {activeCategories.map((category) => (
            <Link
              className={activeCategoryId === category.id ? "is-active" : ""}
              href={`/shop?category=${category.id}`}
              key={category.id}
            >
              {textByLanguage(language, category.nameAr, category.nameHe)}
            </Link>
          ))}
        </div>
      </header>

      <div className="flora-header-spacer" />

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
                {labels.menuHome}
              </Link>

              <div className="mobile-menu-section">
                <span>{labels.filters}</span>
                <nav className="mobile-menu-links" aria-label={labels.filters}>
                  <Link href="/shop" onClick={() => setMenuOpen(false)}>
                    <span>{labels.browseAll}</span>
                  </Link>
                  {activeCategories.map((category) => (
                    <Link href={`/shop?category=${category.id}`} key={category.id} onClick={() => setMenuOpen(false)}>
                      <span>{textByLanguage(language, category.nameAr, category.nameHe)}</span>
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="mobile-menu-section">
                <span>{labels.contact}</span>
                <StoreContactLinks settings={storeData.settings} variant="menu" />
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
                  <Link href="/admin/login" onClick={() => setMenuOpen(false)}>
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
          <motion.div
            animate={{ opacity: 1 }}
            className="cart-overlay"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={() => setCartOpen(false)}
          >
            <motion.aside
              aria-label={labels.cart}
              className="cart-sheet"
              role="dialog"
              initial={
                cartPanelAxis === "y"
                  ? { opacity: 0, y: "100%" }
                  : { opacity: 0, x: `${cartPanelDirection * 100}%` }
              }
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={
                cartPanelAxis === "y"
                  ? { opacity: 0, y: "100%" }
                  : { opacity: 0, x: `${cartPanelDirection * 100}%` }
              }
              onClick={(event) => event.stopPropagation()}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="cart-sheet__head">
                <div className="cart-sheet__title">
                  <h2>{labels.cart}</h2>
                  <p>{labels.cartHint}</p>
                </div>
                <button className="cart-sheet__close" onClick={() => setCartOpen(false)} aria-label="Close cart" type="button">
                  <X size={18} />
                </button>
              </div>

              {cartDetails.length ? (
                <>
                  <div className="cart-sheet__toolbar">
                    <span>
                      {cartItemsCount} {language === "ar" ? "قطعة" : "פריטים"}
                    </span>
                    <button className="clear-cart-trigger" onClick={clearCart} type="button">
                      <Trash2 size={14} />
                      {labels.clearCart}
                    </button>
                  </div>

                  <div className="cart-lines">
                    {cartDetails.map((item) =>
                      item ? (
                        <article className="cart-line" key={`${item.productId}-${item.colorId}`}>
                          <div className="cart-line__image">
                            <Image
                              alt={textByLanguage(language, item.product.nameAr, item.product.nameHe)}
                              height={82}
                              src={item.product.images[0] || "/flora-logo.png"}
                              width={68}
                            />
                          </div>
                          <div className="cart-line__body">
                            <div className="cart-line__top">
                              <strong>{textByLanguage(language, item.product.nameAr, item.product.nameHe)}</strong>
                              <b>{formatPrice(item.total)}</b>
                            </div>
                            <select
                              className="cart-color-select"
                              onChange={(event) => changeCartColor(item.productId, item.colorId, event.target.value)}
                              value={item.colorId}
                            >
                              {item.availableColors.map((color) => (
                                <option key={color.id} value={color.id}>
                                  {textByLanguage(language, color.nameAr, color.nameHe)}
                                </option>
                              ))}
                            </select>
                            <div className="cart-line__actions">
                              <div className="qty-control">
                                <button onClick={() => updateCartQty(item.productId, item.colorId, item.quantity - 1)} type="button">
                                  <Minus size={14} />
                                </button>
                                <span>{item.quantity}</span>
                                <button
                                  disabled={item.quantity >= item.color.stockQuantity}
                                  onClick={() => updateCartQty(item.productId, item.colorId, item.quantity + 1)}
                                  type="button"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                              <button className="cart-line-remove" onClick={() => removeFromCart(item.productId, item.colorId)} type="button">
                                <Trash2 size={13} />
                                {labels.remove}
                              </button>
                            </div>
                          </div>
                        </article>
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
                      type="button"
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
          </motion.div>
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
    <Suspense fallback={<div className="flora-header-spacer" />}>
      <HeaderInner />
    </Suspense>
  );
}


