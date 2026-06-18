"use client";

import { motion, useScroll, useTransform, type Variants } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/header";
import { ProductCard } from "@/components/product-card";
import { StoreContactLinks } from "@/components/store-contact-links";
import { addToCart } from "@/lib/cart";
import { loadStoreData, refreshStoreDataFromSupabase, subscribeToStoreData } from "@/lib/db";
import { getWhatsAppHref, formatPhoneDisplay } from "@/lib/contact";
import { getBrandDisplayName, initialStoreData, type Language, type Product, textByLanguage } from "@/lib/store";

const copy = {
  ar: {
    shop: "تسوق المجموعة",
    browseCategories: "تصفح التصنيفات",
    discovery: "ابدئي أسرع",
    discoveryLead: "وجهنا مسار الصفحة الرئيسية ليقودك إلى التصنيف أو المنتج المناسب بخطوات قليلة وواضحة.",
    discoveryCards: [
      { title: "كل المنتجات", body: "دخول مباشر إلى المجموعة كاملة مع تصفح أسرع.", href: "/shop" },
      { title: "التصنيفات", body: "ابدئي من الحقائب أو الساعات أو الإكسسوارات بدون تشتت.", href: "#collections" },
      { title: "الأكثر طلباً", body: "قطع يتكرر اختيارها لأنها واضحة وناجحة في الإطلالات اليومية.", href: "#best-sellers" },
      { title: "وصل حديثاً", body: "شاهدي أحدث الإضافات قبل أن تصبح قطعاً مطلوبة.", href: "#new-arrivals" }
    ],
    heroEyebrow: "Luxury pieces, quietly curated",
    heroTitle: "أناقة تشبهك، بتفاصيل عالمية",
    heroBody: "مجموعة مختارة من الحقائب والإكسسوارات والساعات. تصفّحي بسهولة وأرسلي طلبك مباشرة من الموقع.",
    editorialTitle: "مجموعات موسمية بلمسة بوتيك عالمية",
    editorialBody: "تنسيق أقرب لتجربة luxury e-commerce: هدوء بصري، إبراز واضح للقطع الأساسية، ومسار شراء سريع.",
    collections: "التصنيفات",
    collectionsLead: "ابدئي من التصنيف المناسب أولاً حتى تكون الرحلة أوضح وأسرع.",
    featured: "مختارات مميزة",
    bestSellers: "الأكثر طلباً",
    newArrivals: "وصل حديثاً",
    discounted: "عروض مختارة",
    brands: "البراندات",
    brandsLead: "أسماء حاضرة بذوق متوازن، مع اختيارات تخدم الذوق اليومي والمناسبات.",
    storyTitle: "قطع مختارة لتعيش أكثر من موسم.",
    storyBody: "نختار القطع التي تبدو راقية، عملية، وسهلة الدمج في الإطلالة اليومية أو المناسبة. الفكرة ليست كثرة الخيارات، بل دقة الاختيار.",
    why: "لماذا Flora Style",
    concierge: "الطلب الأساسي من الموقع",
    conciergeBody: "أضيفي القطع إلى السلة وأرسلي الطلب مباشرة من الموقع. واتساب يبقى فقط للدعم أو الأسئلة السريعة بعد إرسال الطلب.",
    conciergeCta: "توجهي إلى السلة",
    reviews: "آراء العملاء",
    view: "عرض التفاصيل",
    add: "إضافة",
    soldOut: "نفد",
    categoryCta: "عرض التصنيف",
    statProducts: "منتج مختار",
    statZones: "منطقة توصيل",
    statBrands: "ماركة فاخرة",
    whyItems: [
      { title: "تصنيفات واضحة", body: "الوصول إلى المنتج يبدأ من تقسيمات مباشرة تسهّل التصفح بدل إرباك المستخدم." },
      { title: "اختيار مدروس", body: "كل قطعة مضافة هنا مختارة لتخدم ذوقاً فاخرًا وواضحاً، لا مجرد تعبئة واجهة." },
      { title: "طلب أسرع", body: "من الصفحة الرئيسية حتى السلة، المسار مباشر وواضح ويقلل الخطوات غير الضرورية." },
      { title: "دعم عند الحاجة", body: "الموقع هو المسار الأساسي للطلب، وواتساب يبقى فقط لأي استفسار سريع أو ملاحظة إضافية." }
    ],
    reviewItems: [
      "التصنيفات واضحة والمنتج وصلني بالضبط مثل الصور.",
      "التجربة مرتبة جداً والطلب كان سريعاً وواضحاً.",
      "شكل الموقع فاخر فعلاً وليس مثل المتاجر العادية."
    ],
    footer: {
      note: "وجهة رقمية لقطع مختارة بعناية، مع تجربة تصفح أهدأ وأوضح.",
      explore: "استكشف",
      categories: "التصنيفات",
      contact: "التواصل",
      concierge: "الطلب عبر الموقع أولاً",
      supportNote: "للأسئلة السريعة أو التفاصيل الإضافية بعد إرسال الطلب، فريق Flora Style متاح مباشرة.",
      allProducts: "كل المنتجات",
      bestSellers: "الأكثر طلباً",
      newArrivals: "وصل حديثاً",
      story: "قصتنا",
      whatsapp: "واتساب",
      email: "البريد الإلكتروني",
      instagram: "إنستغرام",
      tiktok: "تيك توك",
      facebook: "فيسبوك",
      phone: "هاتف / واتساب",
      copyright: "جميع الحقوق محفوظة"
    }
  },
  he: {
    shop: "גלי את הקולקציה",
    browseCategories: "צפי בקטגוריות",
    discovery: "התחילו מהר",
    discoveryLead: "סידרנו את דף הבית כך שתגיעו מהר יותר אל הקטגוריה או המוצר הנכון.",
    discoveryCards: [
      { title: "כל המוצרים", body: "כניסה ישירה לאוסף המלא עם גלישה מהירה יותר.", href: "/shop" },
      { title: "קטגוריות", body: "התחילו מתיקים, שעונים או אקססוריז בלי בלבול.", href: "#collections" },
      { title: "הכי נמכרים", body: "פריטים שנבחרים שוב ושוב כי הם ברורים ונכונים ללוק היומיומי.", href: "#best-sellers" },
      { title: "הגיע עכשיו", body: "צפו בהוספות החדשות ביותר לפני שהן הופכות לפריטים מבוקשים.", href: "#new-arrivals" }
    ],
    heroEyebrow: "Luxury pieces, quietly curated",
    heroTitle: "אלגנטיות שמרגישה אישית",
    heroBody: "Flora Style היא חוויית קנייה יוקרתית לתיקים, אביזרים ושעונים שנבחרו בקפידה, עם מסלול ברור שמוביל מהר למה שהלקוחה מחפשת.",
    editorialTitle: "קולקציות עונתיות בגישת בוטיק גלובלית",
    editorialBody: "מראה קרוב יותר לחוויית luxury e-commerce: שקט ויזואלי, הדגשה לפריטים המרכזיים, וזרימת רכישה מהירה.",
    collections: "קטגוריות",
    collectionsLead: "התחילי מהקטגוריה הנכונה כדי שהניווט יהיה ברור ומהיר יותר.",
    featured: "בחירות מודגשות",
    bestSellers: "הנמכרים ביותר",
    newArrivals: "חדש באתר",
    discounted: "מחירי בחירה",
    brands: "מותגים",
    brandsLead: "שמות נוכחים עם טעם מאוזן, ובחירות שמתאימות ליומיום ולאירועים.",
    storyTitle: "פריטים שנבחרו להישאר רלוונטיים יותר מעונה אחת.",
    storyBody: "אנחנו בוחרים פריטים אלגנטיים, שימושיים וקלים לשילוב בלוק יומיומי או לאירוע. לא עודף אפשרויות, אלא בחירה מדויקת.",
    why: "למה Flora Style",
    concierge: "ההזמנה הראשית דרך האתר",
    conciergeBody: "הוסיפי פריטים לעגלה ושלחי את ההזמנה ישירות מהאתר. וואטסאפ נשאר רק לתמיכה או לשאלה מהירה אחרי שליחת ההזמנה.",
    conciergeCta: "מעבר לעגלה",
    reviews: "חוות דעת לקוחות",
    view: "לפרטים",
    add: "הוספה",
    soldOut: "אזל",
    categoryCta: "לצפייה בקטגוריה",
    statProducts: "מוצר נבחר",
    statZones: "אזור משלוח",
    statBrands: "מותג יוקרתי",
    whyItems: [
      { title: "קטגוריות ברורות", body: "הלקוחה מגיעה מהר יותר למוצר כשהחלוקה ברורה ולא עמוסה." },
      { title: "בחירה מדויקת", body: "כל פריט נבחר כדי לשדר יוקרה אמיתית ולא רק למלא את המסך." },
      { title: "רכישה מהירה", body: "מהעמוד הראשי ועד העגלה, הזרימה ישירה וברורה עם פחות צעדים מיותרים." },
      { title: "תמיכה בעת הצורך", body: "האתר הוא המסלול הראשי להזמנה, ווואטסאפ נשאר רק לשאלה מהירה או פרט נוסף." }
    ],
    reviewItems: [
      "הקטגוריות ברורות והמוצר הגיע בדיוק כמו בתמונות.",
      "החוויה מסודרת מאוד וההזמנה הייתה מהירה.",
      "האתר באמת מרגיש יוקרתי ולא כמו חנות רגילה."
    ],
    footer: {
      note: "בית דיגיטלי לפריטים שנבחרו בקפידה, עם חוויית גלישה שקטה וברורה יותר.",
      explore: "לגלות",
      categories: "קטגוריות",
      contact: "יצירת קשר",
      concierge: "הזמנה דרך האתר תחילה",
      supportNote: "לשאלות מהירות או להזמנות מיוחדות, צוות Flora Style זמין ישירות.",
      allProducts: "כל המוצרים",
      bestSellers: "הנמכרים ביותר",
      newArrivals: "חדש באתר",
      story: "הסיפור שלנו",
      whatsapp: "וואטסאפ",
      email: "אימייל",
      instagram: "אינסטגרם",
      tiktok: "טיקטוק",
      facebook: "פייסבוק",
      phone: "טלפון / וואטסאפ",
      copyright: "כל הזכויות שמורות"
    }
  }
} as const;

const reveal: Variants = {
  hidden: { opacity: 0, y: 34 },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] } }
};

export function Storefront() {
  const [storeData, setStoreData] = useState(initialStoreData);
  const [language, setLanguage] = useState<Language>("ar");
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const labels = copy[language];

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

  const activeProducts = useMemo(() => storeData.products.filter((product) => product.active), [storeData.products]);
  const bestSellers = useMemo(() => {
    const items = activeProducts.filter((product) => product.bestSeller);
    return items.length ? items : activeProducts.slice(0, 4);
  }, [activeProducts]);
  const newArrivals = useMemo(() => [...activeProducts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4), [activeProducts]);
  const activeCategories = useMemo(() => storeData.categories.filter((category) => category.active), [storeData.categories]);
  const activeBrands = useMemo(() => storeData.brands.filter((brand) => brand.active), [storeData.brands]);
  const banner = storeData.banners.find((entry) => entry.active) || storeData.banners[0];
  const featuredCategories = activeCategories.slice(0, 4);

  const productsPerCategory = useMemo(() => {
    return activeProducts.reduce<Record<string, number>>((acc, product) => {
      acc[product.categoryId] = (acc[product.categoryId] ?? 0) + 1;
      return acc;
    }, {});
  }, [activeProducts]);

  async function handleAddToCart(product: Product) {
    const fresh = await refreshStoreDataFromSupabase();
    const color = fresh.colors.find((entry) => entry.productId === product.id && entry.stockQuantity > 0);
    if (!color) return;
    addToCart(product.id, color.id, 1, { colors: fresh.colors });
    window.dispatchEvent(new CustomEvent("flora-open-cart"));
  }

  return (
    <>
      <Header />
      <main className="luxury-shell flora-home" dir="rtl">
        <section className="luxury-hero flora-home__hero" ref={heroRef}>
          <motion.div className="luxury-hero__media flora-home__hero-media" style={{ y: heroY }}>
            {banner ? <Image className="luxury-hero__image" src={banner.imageUrl} alt="Flora Style editorial" fill priority sizes="100vw" /> : null}
          </motion.div>
          <motion.div className="luxury-hero__content flora-home__hero-content" initial="hidden" animate="show" variants={reveal}>
            <h1>{banner ? textByLanguage(language, banner.titleAr, banner.titleHe) : labels.heroTitle}</h1>
            <p>{banner ? textByLanguage(language, banner.subtitleAr, banner.subtitleHe) : labels.heroBody}</p>
            <div className="luxury-actions">
              <Link href="/shop">{labels.shop}</Link>
              <a href="#collections">{labels.browseCategories}</a>
            </div>
          </motion.div>
        </section>

        <section className="luxury-stat-band">
          <div>
            <strong>{activeProducts.length}</strong>
            <span>{labels.statProducts}</span>
          </div>
          <div>
            <strong>{storeData.deliveryZones.length}</strong>
            <span>{labels.statZones}</span>
          </div>
          <div>
            <strong>{activeBrands.length}</strong>
            <span>{labels.statBrands}</span>
          </div>
        </section>

        <AnimatedSection id="collections" eyebrow="01" title={labels.collections}>
          <div className="flora-category-grid">
            {featuredCategories.map((category) => (
              <Link className="flora-category-card" href={`/shop?category=${category.id}`} key={category.id}>
                <div className="flora-category-card__image">
                  <Image src={category.imageUrl} alt={textByLanguage(language, category.nameAr, category.nameHe)} fill sizes="(max-width: 900px) 100vw, 25vw" />
                </div>
                <div className="flora-category-card__body">
                  <span>{textByLanguage(language, category.nameAr, category.nameHe)}</span>
                  <strong>{productsPerCategory[category.id] ?? 0}</strong>
                </div>
              </Link>
            ))}
          </div>
        </AnimatedSection>

        <AnimatedSection id="best-sellers" eyebrow="02" title={labels.bestSellers}>
          <div className="luxury-product-grid product-rail--scroll">
            {bestSellers.map((product) => {
              const stock = storeData.colors.filter((color) => color.productId === product.id).reduce((sum, color) => sum + color.stockQuantity, 0);
              return (
                <ProductCard
                  addLabel={labels.add}
                  key={product.id}
                  language={language}
                  onAdd={handleAddToCart}
                  product={product}
                  showDescription
                  soldOutLabel={labels.soldOut}
                  stock={stock}
                  viewLabel={labels.view}
                />
              );
            })}
          </div>
        </AnimatedSection>

        <AnimatedSection id="new-arrivals" eyebrow="03" title={labels.newArrivals}>
          <div className="luxury-product-grid product-rail--scroll">
            {newArrivals.map((product) => {
              const stock = storeData.colors.filter((color) => color.productId === product.id).reduce((sum, color) => sum + color.stockQuantity, 0);
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
        </AnimatedSection>

        <AnimatedSection id="brands" eyebrow="04" title={labels.brands}>
          <div className="brand-wall__lead">
            <p>{labels.brandsLead}</p>
            <Link href="/shop">{labels.shop}</Link>
          </div>
          <div className="brand-wall">
            {activeBrands.map((brand) => (
              <Link className="brand-wall__tile brand-wall__tile--text" href={`/shop?brand=${brand.id}`} key={brand.id} aria-label={getBrandDisplayName(language, brand)}>
                <strong>{getBrandDisplayName(language, brand)}</strong>
              </Link>
            ))}
          </div>
        </AnimatedSection>

        <AnimatedSection id="reviews" eyebrow="05" title={labels.reviews}>
          <div className="review-grid">
            {labels.reviewItems.map((quote, index) => (
              <blockquote key={quote}>
                <p>&ldquo;{quote}&rdquo;</p>
                <cite>Flora Style · 0{index + 1}</cite>
              </blockquote>
            ))}
          </div>
        </AnimatedSection>

        <section className="brand-story flora-home__story" id="story">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={reveal}>
            <p className="luxury-kicker">Brand Story</p>
            <h2>{labels.storyTitle}</h2>
            <p>{labels.storyBody}</p>
          </motion.div>
          <motion.div
            className="story-image"
            initial={{ clipPath: "inset(12% 12% 12% 12%)" }}
            whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src="https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1600&q=88"
              alt="Flora Style atelier story"
              fill
              sizes="(max-width: 900px) 100vw, 50vw"
            />
          </motion.div>
        </section>

        <section className="concierge-banner">
          <motion.div className="concierge-banner__copy" initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }}>
            <p className="luxury-kicker">WhatsApp Concierge</p>
            <h2>{labels.concierge}</h2>
            <p>{labels.conciergeBody}</p>
          </motion.div>
          <motion.a
            className="concierge-banner__action"
            href="/checkout"
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
          >
            {labels.conciergeCta}
          </motion.a>
        </section>

        <footer className="luxury-footer">
          <div className="luxury-footer__inner">
            <div className="luxury-footer__lead">
              <div className="luxury-footer__brand">
                <Image src="/flora-logo.png" alt="Flora Style" width={64} height={64} />
                <div>
                  <h2>{storeData.settings.storeName}</h2>
                  <p>{labels.footer.note}</p>
                </div>
              </div>

              <a className="luxury-footer__cta" href={getWhatsAppHref(storeData.settings.whatsappNumber)} rel="noreferrer" target="_blank">
                <strong>{labels.footer.concierge}</strong>
                <span>{labels.footer.supportNote}</span>
              </a>
            </div>

            <div className="luxury-footer__grid">
              <div className="luxury-footer__column">
                <span>{labels.footer.explore}</span>
                <Link href="/shop">{labels.footer.allProducts}</Link>
                <Link href="#best-sellers">{labels.footer.bestSellers}</Link>
                <Link href="#new-arrivals">{labels.footer.newArrivals}</Link>
                <Link href="#story">{labels.footer.story}</Link>
              </div>

              <div className="luxury-footer__column">
                <span>{labels.footer.categories}</span>
                {activeCategories.slice(0, 4).map((category) => (
                  <Link href={`/shop?category=${category.id}`} key={category.id}>
                    {textByLanguage(language, category.nameAr, category.nameHe)}
                  </Link>
                ))}
              </div>

              <div className="luxury-footer__column">
                <span>{labels.footer.contact}</span>
                <StoreContactLinks settings={storeData.settings} />
              </div>
            </div>
          </div>

          <div className="luxury-footer__bottom">
            <span>
              © {new Date().getFullYear()} {storeData.settings.storeName} - {labels.footer.copyright}
            </span>
            <span>{formatPhoneDisplay(storeData.settings.whatsappNumber)}</span>
          </div>
        </footer>
      </main>
    </>
  );
}

function AnimatedSection({ id, eyebrow, title, children }: { id?: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <motion.section className="luxury-section" id={id} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} variants={reveal}>
      <div className="luxury-section__head">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}
