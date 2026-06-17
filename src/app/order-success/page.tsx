"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { formatPrice, initialStoreData, Language, textByLanguage } from "@/lib/store";
import { loadStoreData } from "@/lib/db";
import { fetchOrderById } from "@/lib/supabase/orders";

const successCopy = {
  ar: {
    title: "تم استلام طلبك بنجاح!",
    subtitle: "شكراً لتسوقك من Flora Style. تم تسجيل طلبك في نظامنا برقم:",
    adminNotice: "تم إرسال الطلب مباشرة إلى لوحة الأدمن وسيتم مراجعته والتواصل معك إذا لزم أي تفصيل إضافي.",
    orderSummary: "تفاصيل الطلب",
    customerName: "اسم العميل",
    phone: "رقم الهاتف",
    address: "العنوان",
    notes: "الملاحظات",
    total: "الإجمالي الكلي",
    subtotal: "مجموع المنتجات",
    deliveryFee: "تكلفة التوصيل",
    backToHome: "العودة للرئيسية",
    orderNotFound: "عذراً، لم نجد تفاصيل الطلب المطلوب.",
    itemsOrdered: "المنتجات المطلوبة"
  },
  he: {
    title: "ההזמנה התקבלה בהצלחה!",
    subtitle: "תודה שקנית ב-Flora Style. הזמנתך נרשמה במערכת עם מספר:",
    adminNotice: "ההזמנה נשלחה ישירות ללוח הניהול ותיבדק בהקדם. ניצור איתך קשר רק אם יידרש פרט נוסף.",
    orderSummary: "פרטי הזמנה",
    customerName: "שם לקוח",
    phone: "טלפון",
    address: "כתובת",
    notes: "הערות",
    total: "סה״כ לתשלום",
    subtotal: "סכום ביניים",
    deliveryFee: "דמי משלוח",
    backToHome: "חזרה לדף הבית",
    orderNotFound: "מצטערים, לא נמצאו פרטי ההזמנה המבוקשת.",
    itemsOrdered: "פריטים שהוזמנו"
  }
};

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get("orderId") || "";

  // Dynamic States
  const [storeData, setStoreData] = useState(initialStoreData);
  const [language, setLanguage] = useState<Language>("ar");

  const labels = successCopy[language];

  // Sync Language state from Header
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("flora-language") as Language;
      if (saved) setLanguage(saved);
    }
    const handleLangChange = (e: any) => setLanguage(e.detail);
    window.addEventListener("flora-language-changed", handleLangChange);
    return () => window.removeEventListener("flora-language-changed", handleLangChange);
  }, []);

  // Reload storeData to get the latest saved order.
  // If it's not in local cache, try to fetch the exact order from Supabase.
  useEffect(() => {
    setStoreData(loadStoreData());

    async function tryFetchFromSupabase() {
      try {
        const remoteOrder = await fetchOrderById(orderId);
        if (remoteOrder) {
          setStoreData((prev) => ({
            ...prev,
            orders: prev.orders.some((entry) => entry.id === remoteOrder.id)
              ? prev.orders
              : [remoteOrder, ...prev.orders],
          }));
        }
      } catch {
        /* ignore */
      }
    }

    if (orderId) {
      tryFetchFromSupabase();
    }
  }, [orderId]);

  // Load order details
  const order = useMemo(() => {
    return storeData.orders.find((o) => o.id === orderId);
  }, [storeData.orders, orderId]);

  const zone = useMemo(() => {
    if (!order) return null;
    return storeData.deliveryZones.find((z) => z.id === order.deliveryZoneId);
  }, [storeData.deliveryZones, order]);

  return (
    <>
      <Header />
      <main className="order-success-page" dir="rtl">
        <section className="order-success-shell">
          {order ? (
            <>
              <div className="order-success-hero">
                <div className="order-success-badge" aria-hidden="true">
                  ✓
                </div>
                <div className="order-success-copy">
                  <h1>{labels.title}</h1>
                  <p>
                    {labels.subtitle} <strong className="order-success-number">#{order.orderNumber}</strong>
                  </p>
                </div>
              </div>

              <div className="order-success-notice">
                <span className="luxury-kicker">Flora Style</span>
                <p>{labels.adminNotice}</p>
              </div>

              <section className="order-success-card" aria-label={labels.orderSummary}>
                <div className="order-success-card__head">
                  <div>
                    <span>{labels.orderSummary}</span>
                    <h2>#{order.orderNumber}</h2>
                  </div>
                </div>

                <div className="order-success-info-grid">
                  <div className="order-success-field">
                    <span>{labels.customerName}</span>
                    <strong>{order.customerName}</strong>
                  </div>
                  <div className="order-success-field">
                    <span>{labels.phone}</span>
                    <strong>{order.phoneNumber}</strong>
                  </div>
                  <div className="order-success-field order-success-field--wide">
                    <span>{labels.address}</span>
                    <strong>
                      {zone ? `${textByLanguage(language, zone.nameAr, zone.nameHe)} - ` : ""}
                      {order.detailedAddress}
                    </strong>
                  </div>
                  {order.notes ? (
                    <div className="order-success-field order-success-field--wide">
                      <span>{labels.notes}</span>
                      <p>{order.notes}</p>
                    </div>
                  ) : null}
                </div>

                <div className="order-success-section">
                  <div className="order-success-section__head">
                    <span>{labels.itemsOrdered}</span>
                    <strong>{order.items.length}</strong>
                  </div>
                  <div className="order-success-lines">
                    {order.items.map((item, idx) => {
                      const prod = storeData.products.find((p) => p.id === item.productId);
                      const col = storeData.colors.find((c) => c.id === item.colorId);
                      return (
                        <div className="order-success-line" key={`${item.productId}-${item.colorId}-${idx}`}>
                          <div>
                            <strong>{prod ? textByLanguage(language, prod.nameAr, prod.nameHe) : "منتج"}</strong>
                            <small>
                              {col ? textByLanguage(language, col.nameAr, col.nameHe) : "-"} · {item.quantity} × {formatPrice(item.price)}
                            </small>
                          </div>
                          <b>{formatPrice(item.price * item.quantity)}</b>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="order-success-totals">
                  <div>
                    <span>{labels.subtotal}</span>
                    <strong>{formatPrice(order.subtotal)}</strong>
                  </div>
                  <div>
                    <span>{labels.deliveryFee}</span>
                    <strong>{formatPrice(order.deliveryFee)}</strong>
                  </div>
                  <div className="is-grand">
                    <span>{labels.total}</span>
                    <strong>{formatPrice(order.totalPrice)}</strong>
                  </div>
                </div>
              </section>

              <Link className="order-success-link" href="/">
                {labels.backToHome}
              </Link>
            </>
          ) : (
            <section className="order-success-empty">
              <p>{labels.orderNotFound}</p>
              <Link className="order-success-link order-success-link--primary" href="/">
                {labels.backToHome}
              </Link>
            </section>
          )}
        </section>
      </main>
    </>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--ivory)" }} />}>
      <OrderSuccessContent />
    </Suspense>
  );
}
