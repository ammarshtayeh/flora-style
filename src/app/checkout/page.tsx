"use client";

import { CheckCircle2, MapPin, MessageCircleMore, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { CartItem, clearCart, getCart, subscribeToCart } from "@/lib/cart";
import { loadStoreData, saveStoreData, subscribeToStoreData } from "@/lib/db";
import { formatPrice, initialStoreData, Language, Order, textByLanguage } from "@/lib/store";
import { createOrder } from "@/lib/supabase/orders";

const checkoutCopy = {
  ar: {
    eyebrow: "Checkout",
    title: "خطوة أخيرة، بصياغة أوضح.",
    body: "أكملي تفاصيل التوصيل مرة واحدة، وسنرتب بقية الخطوات معك بسلاسة عبر الطلب أو واتساب.",
    customerInfo: "معلومات الشحن والتوصيل",
    name: "الاسم الكامل",
    phone: "رقم الهاتف",
    city: "المدينة / منطقة التوصيل",
    address: "العنوان التفصيلي",
    notes: "ملاحظات إضافية",
    summary: "ملخص الطلب",
    subtotal: "المجموع الفرعي",
    delivery: "تكلفة التوصيل",
    total: "الإجمالي النهائي",
    submitBtn: "تأكيد وإرسال الطلب",
    emptyCart: "سلة المشتريات فارغة حالياً.",
    backToShop: "العودة للتسوق",
    submitting: "جاري تأكيد الطلب...",
    notesPlaceholder: "أي تفاصيل تساعد في التوصيل أو التنسيق السريع...",
    concierge: "متابعة مباشرة عبر واتساب",
    conciergeBody: "بعد إرسال الطلب، يصبح التنسيق على المقاس أسهل: وقت التوصيل، تأكيد اللون، أو أي ملاحظة أخيرة.",
    secure: "بيانات الطلب تبقى داخل المتجر فقط.",
    deliveryZone: "منطقة التوصيل",
    items: "المنتجات",
    ready: "جاهز للتأكيد"
  },
  he: {
    eyebrow: "Checkout",
    title: "שלב אחרון, בצורה ברורה יותר.",
    body: "ממלאים את פרטי המשלוח פעם אחת, ואנחנו מסדרים את שאר הצעדים בצורה חלקה דרך ההזמנה או הוואטסאפ.",
    customerInfo: "פרטי משלוח וכתובת",
    name: "שם מלא",
    phone: "טלפון",
    city: "עיר / אזור משלוח",
    address: "כתובת מלאה",
    notes: "הערות נוספות",
    summary: "סיכום הזמנה",
    subtotal: "סכום ביניים",
    delivery: "דמי משלוח",
    total: "סה״כ לתשלום",
    submitBtn: "אישור ושליחת הזמנה",
    emptyCart: "עגלת הקניות ריקה כעת.",
    backToShop: "חזרה לחנות",
    submitting: "מאשר הזמנה...",
    notesPlaceholder: "כל פרט שיעזור למשלוח או לתיאום מהיר...",
    concierge: "ליווי ישיר בוואטסאפ",
    conciergeBody: "אחרי שליחת ההזמנה, קל יותר לתאם בדיוק: זמן משלוח, אישור צבע או כל הערה אחרונה.",
    secure: "פרטי ההזמנה נשמרים בתוך החנות בלבד.",
    deliveryZone: "אזור משלוח",
    items: "פריטים",
    ready: "מוכן לאישור"
  }
} as const;

export default function CheckoutPage() {
  const router = useRouter();
  const [storeData, setStoreData] = useState(initialStoreData);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [language, setLanguage] = useState<Language>("ar");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const labels = checkoutCopy[language];

  useEffect(() => {
    setStoreData(loadStoreData());
    setCart(getCart());
    const unsubStore = subscribeToStoreData(setStoreData);
    const unsubCart = subscribeToCart(setCart);
    return () => {
      unsubStore();
      unsubCart();
    };
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
    const activeZones = storeData.deliveryZones.filter((zone) => zone.active);
    if (!selectedZoneId && activeZones.length) setSelectedZoneId(activeZones[0].id);
  }, [selectedZoneId, storeData.deliveryZones]);

  const cartDetails = useMemo(() => {
    return cart
      .map((item) => {
        const product = storeData.products.find((entry) => entry.id === item.productId);
        const color = storeData.colors.find((entry) => entry.id === item.colorId);
        if (!product || !color) return null;
        const price = product.salePrice ?? product.price;
        return { ...item, product, color, price, total: price * item.quantity };
      })
      .filter(Boolean);
  }, [cart, storeData.colors, storeData.products]);

  const subtotal = cartDetails.reduce((sum, item) => sum + (item?.total ?? 0), 0);
  const zone = storeData.deliveryZones.find((entry) => entry.id === selectedZoneId);
  const deliveryFee = zone?.deliveryFee ?? 0;
  const total = subtotal + deliveryFee;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!cartDetails.length || isSubmitting) return;
    setIsSubmitting(true);

    const orderId = `order-${Date.now()}`;
    const orderNumber = `FL-${Math.floor(100000 + Math.random() * 900000)}`;
    const newOrder: Order = {
      id: orderId,
      orderNumber,
      customerName: name,
      phoneNumber: phone,
      deliveryZoneId: selectedZoneId,
      detailedAddress: address,
      notes,
      subtotal,
      deliveryFee,
      totalPrice: total,
      status: "Pending",
      createdAt: new Date().toISOString().slice(0, 10),
      items: cartDetails.map((item) => ({
        productId: item!.productId,
        colorId: item!.colorId,
        quantity: item!.quantity,
        price: item!.price
      }))
    };

    const fresh = loadStoreData();
    fresh.orders = [newOrder, ...fresh.orders];
    saveStoreData(fresh);

    // Persist to Supabase (so the order appears in Admin on any device / browser)
    createOrder(newOrder).catch(() => {
      // If it fails we still have the local copy; admin will fall back to local
    });

    clearCart();
    router.push(`/order-success?orderId=${orderId}`);
  }

  return (
    <>
      <Header />
      <main className="checkout-page" dir="rtl">
        <section className="checkout-hero">
          <p className="luxury-kicker">{labels.eyebrow}</p>
          <h1>{labels.title}</h1>
          <p>{labels.body}</p>
        </section>

        {cartDetails.length ? (
          <section className="checkout-shell">
            <form className="checkout-form-card" onSubmit={handleSubmit}>
              <div className="checkout-card-head">
                <div>
                  <span>{labels.customerInfo}</span>
                  <h2>{labels.ready}</h2>
                </div>
                <div className="checkout-pill">
                  <ShieldCheck size={16} />
                  {labels.secure}
                </div>
              </div>

              <div className="checkout-form-grid">
                <label className="form-row">
                  <span>{labels.name}</span>
                  <input className="field" onChange={(event) => setName(event.target.value)} required type="text" value={name} />
                </label>
                <label className="form-row">
                  <span>{labels.phone}</span>
                  <input className="field" onChange={(event) => setPhone(event.target.value)} required type="tel" value={phone} />
                </label>
                <label className="form-row">
                  <span>{labels.city}</span>
                  <select className="select" onChange={(event) => setSelectedZoneId(event.target.value)} value={selectedZoneId}>
                    {storeData.deliveryZones
                      .filter((entry) => entry.active)
                      .map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {textByLanguage(language, entry.nameAr, entry.nameHe)} - {formatPrice(entry.deliveryFee)}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="form-row">
                  <span>{labels.address}</span>
                  <input className="field" onChange={(event) => setAddress(event.target.value)} required type="text" value={address} />
                </label>
              </div>

              <label className="form-row">
                <span>{labels.notes}</span>
                <textarea className="textarea" onChange={(event) => setNotes(event.target.value)} placeholder={labels.notesPlaceholder} value={notes} />
              </label>

              <div className="checkout-support">
                <div>
                  <MessageCircleMore size={18} />
                  <strong>{labels.concierge}</strong>
                </div>
                <p>{labels.conciergeBody}</p>
              </div>

              <button className="checkout-submit" disabled={isSubmitting} type="submit">
                <CheckCircle2 size={18} />
                {isSubmitting ? labels.submitting : labels.submitBtn}
              </button>
            </form>

            <aside className="checkout-summary-card">
              <div className="checkout-card-head">
                <div>
                  <span>{labels.summary}</span>
                  <h2>
                    {cartDetails.length} {labels.items}
                  </h2>
                </div>
                <div className="checkout-pill">
                  <MapPin size={16} />
                  {zone ? textByLanguage(language, zone.nameAr, zone.nameHe) : labels.deliveryZone}
                </div>
              </div>

              <div className="checkout-lines">
                {cartDetails.map((item) =>
                  item ? (
                    <div className="checkout-line" key={`${item.productId}-${item.colorId}`}>
                      <div className="checkout-line__image">
                        <Image alt="" fill src={item.product.images[0]} sizes="72px" />
                      </div>
                      <div className="checkout-line__content">
                        <strong>{textByLanguage(language, item.product.nameAr, item.product.nameHe)}</strong>
                        <span>{textByLanguage(language, item.color.nameAr, item.color.nameHe)}</span>
                        <small>
                          {item.quantity} × {formatPrice(item.price)}
                        </small>
                      </div>
                      <b>{formatPrice(item.total)}</b>
                    </div>
                  ) : null
                )}
              </div>

              <div className="checkout-totals">
                <div>
                  <span>{labels.subtotal}</span>
                  <strong>{formatPrice(subtotal)}</strong>
                </div>
                <div>
                  <span>{labels.delivery}</span>
                  <strong>{formatPrice(deliveryFee)}</strong>
                </div>
                <div className="is-grand">
                  <span>{labels.total}</span>
                  <strong>{formatPrice(total)}</strong>
                </div>
              </div>
            </aside>
          </section>
        ) : (
          <section className="checkout-empty">
            <strong>{labels.emptyCart}</strong>
            <Link href="/shop">{labels.backToShop}</Link>
          </section>
        )}
      </main>
    </>
  );
}
