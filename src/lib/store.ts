import { isValidImageSource, uniqueImageUrls } from "@/lib/image-url";

export type Language = "ar" | "he";

export type Category = {
  id: string;
  slug: string;
  nameAr: string;
  nameHe: string;
  descriptionAr: string;
  descriptionHe: string;
  imageUrl: string;
  active: boolean;
};

export type Brand = {
  id: string;
  slug: string;
  nameAr: string;
  nameHe: string;
  descriptionAr: string;
  descriptionHe: string;
  logoUrl: string;
  active: boolean;
};

export type ProductColor = {
  id: string;
  productId: string;
  nameAr: string;
  nameHe: string;
  value: string;
  stockQuantity: number;
};

export type Product = {
  id: string;
  slug: string;
  sku: string;
  categoryId: string;
  brandId: string;
  nameAr: string;
  nameHe: string;
  descriptionAr: string;
  descriptionHe: string;
  storyAr: string;
  storyHe: string;
  price: number;
  salePrice?: number;
  images: string[];
  bestSeller: boolean;
  featured: boolean;
  active: boolean;
  createdAt: string;
};

export type DeliveryZone = {
  id: string;
  nameAr: string;
  nameHe: string;
  deliveryFee: number;
  active: boolean;
};

export type Banner = {
  id: string;
  titleAr: string;
  titleHe: string;
  subtitleAr: string;
  subtitleHe: string;
  imageUrl: string;
  imageUrls: string[];
  active: boolean;
};

export function getBannerImages(banner?: Pick<Banner, "imageUrl" | "imageUrls"> | null) {
  const gallery = withoutDeprecatedHeroImages(banner?.imageUrls ?? []);
  if (gallery.length) return gallery;

  const single = banner?.imageUrl?.trim();
  if (!single || !isValidImageSource(single) || deprecatedHeroImageSources.has(single)) return [];
  return [single];
}

export function normalizeBanner(banner: Banner): Banner {
  const imageUrls = uniqueImageUrls(getBannerImages(banner));
  return {
    ...banner,
    imageUrls,
    imageUrl: imageUrls[0] ?? "",
  };
}

export const defaultHeroCarouselImages = [
  "/flora-hero-bag.png",
  "/flora-hero-pink-bag.png",
  "/flora-hero-watch.png",
] as const;

const deprecatedHeroImageSources = new Set(["/flora-hero-model.png"]);

function withoutDeprecatedHeroImages(urls: string[]) {
  return uniqueImageUrls(urls).filter((url) => !deprecatedHeroImageSources.has(url));
}

export type StoreSettings = {
  storeName: string;
  whatsappNumber: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  email: string;
  addressAr: string;
  addressHe: string;
};

export type OrderStatus = "Pending" | "Confirmed" | "Processing" | "Delivered" | "Cancelled";

export type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  phoneNumber: string;
  deliveryZoneId: string;
  detailedAddress: string;
  notes: string;
  subtotal: number;
  deliveryFee: number;
  totalPrice: number;
  status: OrderStatus;
  stockDeducted?: boolean;
  createdAt: string;
  items: Array<{
    productId: string;
    colorId: string;
    quantity: number;
    price: number;
  }>;
};

export type StoreData = {
  categories: Category[];
  brands: Brand[];
  products: Product[];
  colors: ProductColor[];
  deliveryZones: DeliveryZone[];
  banners: Banner[];
  settings: StoreSettings;
  orders: Order[];
};

const images = {
  heroSlides: [...defaultHeroCarouselImages],
  bags: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1400&q=88",
  bagAlt: "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=1400&q=88",
  tote: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1400&q=88",
  accessories: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1400&q=88",
  accessoriesAlt: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1400&q=88",
  watches: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1400&q=88",
  watchesAlt: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=1400&q=88",
  sunglasses: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1400&q=88",
  atelier: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1800&q=88",
  editorial: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1800&q=88"
};

export const initialStoreData: StoreData = {
  categories: [
    {
      id: "cat-bags",
      slug: "handbags",
      nameAr: "حقائب",
      nameHe: "תיקים",
      descriptionAr: "حقائب مصممة لترافق اليوم من الصباح حتى المساء.",
      descriptionHe: "תיקים שנבחרו ללוות את היום מבוקר עד ערב.",
      imageUrl: images.bags,
      active: true
    },
    {
      id: "cat-accessories",
      slug: "accessories",
      nameAr: "إكسسوارات",
      nameHe: "אביזרים",
      descriptionAr: "تفاصيل دقيقة تضيف حضوراً هادئاً وفاخراً.",
      descriptionHe: "פרטים מדויקים שמוסיפים נוכחות שקטה ויוקרתית.",
      imageUrl: images.accessories,
      active: true
    },
    {
      id: "cat-watches",
      slug: "watches",
      nameAr: "ساعات",
      nameHe: "שעונים",
      descriptionAr: "ساعات أنيقة بخطوط نظيفة وملمس فاخر.",
      descriptionHe: "שעונים אלגנטיים עם קווים נקיים ותחושה יוקרתית.",
      imageUrl: images.watches,
      active: true
    },
    {
      id: "cat-sunglasses",
      slug: "sunglasses",
      nameAr: "نظارات شمسية",
      nameHe: "משקפי שמש",
      descriptionAr: "إطارات عصرية تمنح الإطلالة لمسة نهائية.",
      descriptionHe: "מסגרות מודרניות שמעניקות למראה סיום מדויק.",
      imageUrl: images.sunglasses,
      active: true
    }
  ],
  brands: [
    {
      id: "brand-celine",
      slug: "celine",
      nameAr: "سيلين",
      nameHe: "סלין",
      descriptionAr: "أناقة باريسية مينيمال بخطوط نظيفة وحضور هادئ.",
      descriptionHe: "אלגנטיות פריזאית מינימליסטית עם קווים נקיים.",
      logoUrl: "/brands/celine.png",
      active: true
    },
    {
      id: "brand-chloe",
      slug: "chloe",
      nameAr: "كلوي",
      nameHe: "קלואה",
      descriptionAr: "أنوثة ناعمة بروح بوهيمية راقية.",
      descriptionHe: "נשיות עדינה ברוח בוהמית מעודנת.",
      logoUrl: "/brands/chloe.png",
      active: true
    },
    {
      id: "brand-marc-jacobs",
      slug: "marc-jacobs",
      nameAr: "مارك جايكوبس",
      nameHe: "מארק ג'ייקובס",
      descriptionAr: "جرأة عصرية بلمسة أمريكية مميزة.",
      descriptionHe: "נועזות מודרנית בנגיעה אמריקאית ייחודית.",
      logoUrl: "/brands/marc-jacobs.png",
      active: true
    },
    {
      id: "brand-coach",
      slug: "coach",
      nameAr: "كوتش",
      nameHe: "קואץ'",
      descriptionAr: "حِرفية جلدية أمريكية بتفاصيل كلاسيكية.",
      descriptionHe: "אומנות עור אמריקאית עם פרטים קלאסיים.",
      logoUrl: "/brands/coach.png",
      active: true
    },
    {
      id: "brand-prada",
      slug: "prada",
      nameAr: "برادا",
      nameHe: "פראדה",
      descriptionAr: "حضور عصري وخطوط عملية راقية.",
      descriptionHe: "נוכחות מודרנית וקווים פרקטיים יוקרתיים.",
      logoUrl: "/brands/prada.png",
      active: true
    },
    {
      id: "brand-jacquemus",
      slug: "jacquemus",
      nameAr: "جاكموس",
      nameHe: "ז'קמוס",
      descriptionAr: "تصاميم جريئة بروح متوسطية معاصرة.",
      descriptionHe: "עיצובים נועזים ברוח ים-תיכונית עכשווית.",
      logoUrl: "/brands/jacquemus.png",
      active: true
    },
    {
      id: "brand-miu-miu",
      slug: "miu-miu",
      nameAr: "ميو ميو",
      nameHe: "מיו מיו",
      descriptionAr: "أنوثة عصرية مرحة بتفاصيل لافتة.",
      descriptionHe: "נשיות מודרנית ושובבה עם פרטים בולטים.",
      logoUrl: "/brands/miu-miu.png",
      active: true
    },
    {
      id: "brand-hermes",
      slug: "hermes",
      nameAr: "هيرميس",
      nameHe: "הרמס",
      descriptionAr: "أيقونة الفخامة والحِرفية الفرنسية النادرة.",
      descriptionHe: "סמל היוקרה והאומנות הצרפתית הנדירה.",
      logoUrl: "/brands/hermes.png",
      active: true
    },
    {
      id: "brand-guess",
      slug: "guess",
      nameAr: "غيس",
      nameHe: "גס",
      descriptionAr: "ستايل يومي عصري بإطلالة جذابة.",
      descriptionHe: "סטייל יומיומי מודרני ומראה מושך.",
      logoUrl: "/brands/guess.png",
      active: true
    },
    {
      id: "brand-lacoste",
      slug: "lacoste",
      nameAr: "لاكوست",
      nameHe: "לקוסט",
      descriptionAr: "أناقة رياضية كلاسيكية بروح فرنسية.",
      descriptionHe: "אלגנטיות ספורטיבית קלאסית ברוח צרפתית.",
      logoUrl: "/brands/lacoste.png",
      active: true
    },
    {
      id: "brand-rolex",
      slug: "rolex",
      nameAr: "رولكس",
      nameHe: "רולקס",
      descriptionAr: "رمز الساعات الفاخرة والدقة عبر الزمن.",
      descriptionHe: "סמל שעוני היוקרה והדיוק לאורך זמן.",
      logoUrl: "/brands/rolex.png",
      active: true
    },
    {
      id: "brand-balmain",
      slug: "balmain",
      nameAr: "بالمان",
      nameHe: "בלמיין",
      descriptionAr: "فخامة باريسية جريئة بتفاصيل قوية.",
      descriptionHe: "יוקרה פריזאית נועזת עם פרטים חזקים.",
      logoUrl: "/brands/balmain.png",
      active: true
    },
    {
      id: "brand-michael-kors",
      slug: "michael-kors",
      nameAr: "مايكل كورس",
      nameHe: "מייקל קורס",
      descriptionAr: "أناقة عملية بلمسة أمريكية فاخرة.",
      descriptionHe: "אלגנטיות פרקטית בנגיעה אמריקאית יוקרתית.",
      logoUrl: "/brands/michael-kors.png",
      active: true
    },
    {
      id: "brand-dior",
      slug: "dior",
      nameAr: "ديور",
      nameHe: "דיור",
      descriptionAr: "أناقة كلاسيكية بتفاصيل ناعمة.",
      descriptionHe: "אלגנטיות קלאסית עם פרטים עדינים.",
      logoUrl: "/brands/dior.png",
      active: true
    },
    {
      id: "brand-fendi",
      slug: "fendi",
      nameAr: "فندي",
      nameHe: "פנדי",
      descriptionAr: "حِرفية إيطالية بروح عصرية لافتة.",
      descriptionHe: "אומנות איטלקית ברוח מודרנית בולטת.",
      logoUrl: "/brands/fendi.png",
      active: true
    },
    {
      id: "brand-valentino",
      slug: "valentino",
      nameAr: "فالنتينو",
      nameHe: "ולנטינו",
      descriptionAr: "رومانسية إيطالية فاخرة بتفاصيل دقيقة.",
      descriptionHe: "רומנטיקה איטלקית יוקרתית עם פרטים מדויקים.",
      logoUrl: "/brands/valentino.png",
      active: true
    },
    {
      id: "brand-balenciaga",
      slug: "balenciaga",
      nameAr: "بالنسياغا",
      nameHe: "בלנסיאגה",
      descriptionAr: "تصاميم جريئة تعيد تعريف الفخامة الحديثة.",
      descriptionHe: "עיצובים נועזים שמגדירים מחדש יוקרה מודרנית.",
      logoUrl: "/brands/balenciaga.png",
      active: true
    },
    {
      id: "brand-gucci",
      slug: "gucci",
      nameAr: "غوتشي",
      nameHe: "גוצ'י",
      descriptionAr: "فخامة إيطالية أيقونية بحضور جريء.",
      descriptionHe: "יוקרה איטלקית איקונית עם נוכחות נועזת.",
      logoUrl: "/brands/gucci.png",
      active: true
    },
    {
      id: "brand-louis-vuitton",
      slug: "louis-vuitton",
      nameAr: "لويس فيتون",
      nameHe: "לואי ויטון",
      descriptionAr: "أيقونة السفر والفخامة الفرنسية الخالدة.",
      descriptionHe: "סמל הנסיעות והיוקרה הצרפתית הנצחית.",
      logoUrl: "/brands/louis-vuitton.png",
      active: true
    },
    {
      id: "brand-chanel",
      slug: "chanel",
      nameAr: "شانيل",
      nameHe: "שאנל",
      descriptionAr: "تصاميم فاخرة بتوازن بين الجرأة والهدوء.",
      descriptionHe: "עיצובים יוקרתיים עם איזון בין נועזות ושקט.",
      logoUrl: "/brands/chanel.png",
      active: true
    },
    {
      id: "brand-ysl",
      slug: "ysl",
      nameAr: "إيف سان لوران",
      nameHe: "איב סן לורן",
      descriptionAr: "أناقة باريسية أيقونية بحضور جريء وخالد.",
      descriptionHe: "אלגנטיות פריזאית איקונית עם נוכחות נצחית.",
      logoUrl: "/brands/ysl.png",
      active: true
    }
  ],
  products: [],
  colors: [],
  deliveryZones: [
    { id: "zone-west-bank", nameAr: "الضفة الغربية", nameHe: "הגדה המערבית", deliveryFee: 20, active: true },
    { id: "zone-jerusalem", nameAr: "القدس", nameHe: "ירושלים", deliveryFee: 30, active: true },
    { id: "zone-abu-ghosh", nameAr: "أبو غوش", nameHe: "אבו גוש", deliveryFee: 35, active: true },
    { id: "zone-48", nameAr: "مناطق 48", nameHe: "אזורי 48", deliveryFee: 40, active: true }
  ],
  banners: [
    {
      id: "banner-main",
      titleAr: "أناقة تشبهك، بتفاصيل عالمية",
      titleHe: "אלגנטיות שמרגישה אישית",
      subtitleAr: "مجموعة مختارة من الحقائب والإكسسوارات والساعات. تصفّحي بسهولة وأرسلي طلبك مباشرة من الموقع.",
      subtitleHe: "אוסף נבחר של תיקים, אביזרים ושעונים. גלשי בנוחות ושלחי את ההזמנה ישירות מהאתר.",
      imageUrl: images.heroSlides[0],
      imageUrls: [...images.heroSlides],
      active: true
    }
  ],
  settings: {
    storeName: "Flora Style",
    whatsappNumber: "972595405245",
    instagramUrl: "https://www.instagram.com/flora_style2?igsh=MXNiamxkdzZwaDc0cA%3D%3D&utm_source=qr",
    facebookUrl: "",
    tiktokUrl: "",
    email: "",
    addressAr: "فلسطين",
    addressHe: "פלסטין"
  },
  orders: []
};

export function formatPrice(amount: number) {
  return `${amount.toLocaleString("he-IL")} NIS`;
}

export function textByLanguage(language: Language, ar: string, he: string) {
  return language === "ar" ? ar : he;
}

const brandSlugOverrides: Record<string, string> = {
  ysl: "YSL",
  "louis-vuitton": "Louis Vuitton",
  "marc-jacobs": "Marc Jacobs",
  "michael-kors": "Michael Kors",
  "miu-miu": "Miu Miu",
};

function formatBrandSlug(slug: string) {
  if (brandSlugOverrides[slug]) {
    return brandSlugOverrides[slug];
  }

  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getBrandDisplayName(language: Language, brand: Pick<Brand, "slug" | "nameHe">) {
  return language === "he" ? brand.nameHe : formatBrandSlug(brand.slug);
}

export function getProductBySlug(slug: string) {
  return initialStoreData.products.find((product) => product.slug === slug && product.active);
}

export function getProductBrand(product: Product) {
  return initialStoreData.brands.find((brand) => brand.id === product.brandId);
}

export function getProductCategory(product: Product) {
  return initialStoreData.categories.find((category) => category.id === product.categoryId);
}

export function getProductColors(productId: string) {
  return initialStoreData.colors.filter((color) => color.productId === productId);
}

export function getRelatedProducts(product: Product, limit = 4) {
  const related = initialStoreData.products.filter(
    (candidate) =>
      candidate.id !== product.id &&
      candidate.active &&
      (candidate.categoryId === product.categoryId || candidate.brandId === product.brandId)
  );

  const filler = initialStoreData.products.filter(
    (candidate) => candidate.id !== product.id && candidate.active && !related.some((item) => item.id === candidate.id)
  );

  return [...related, ...filler].slice(0, limit);
}

export function getProductUrl(product: Product) {
  return `/products/${product.slug}`;
}
