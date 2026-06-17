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
      <main className="luxury-shell" dir="rtl" style={{ background: "var(--ivory)", color: "var(--ink)", minHeight: "100vh" }}>
        
        <div style={{
          maxWidth: "760px",
          margin: "0 auto",
          padding: "40px 24px",
          display: "grid",
          gap: "30px",
          justifyItems: "center",
          textAlign: "center"
        }}>

          {order ? (
            <>
              {/* Animated Glowing Success Checkmark */}
              <div style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                background: "rgba(46, 213, 115, 0.1)",
                border: "2px solid #2ed573",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "40px",
                boxShadow: "0 0 25px rgba(46, 213, 115, 0.35)",
                margin: "20px 0 10px"
              }}>
                ✓
              </div>

              <h2 style={{ fontSize: "30px", fontWeight: 300, color: "var(--ink)", margin: 0 }}>
                {labels.title}
              </h2>

              <p style={{ color: "var(--muted)", fontSize: "15px", lineHeight: 1.8, margin: 0, maxWidth: "580px" }}>
                {labels.subtitle} <strong style={{ color: "var(--gold)" }}>#{order.orderNumber}</strong>
              </p>

              <div style={{
                background: "rgba(22, 22, 21, 0.5)",
                border: "1px solid var(--line)",
                borderRadius: "16px",
                padding: "24px",
                width: "100%",
                display: "grid",
                gap: "16px",
                justifyItems: "center"
              }}>
                <span style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.6, maxWidth: "420px" }}>
                  {labels.adminNotice}
                </span>
              </div>

              {/* Order Invoice Block */}
              <div style={{
                background: "rgba(22, 22, 21, 0.8)",
                border: "1px solid var(--line)",
                borderRadius: "16px",
                padding: "30px",
                width: "100%",
                textAlign: "start",
                display: "grid",
                gap: "20px"
              }}>
                <h3 style={{ color: "var(--gold)", fontSize: "18px", borderBottom: "1px solid var(--line)", paddingBottom: "10px", margin: 0, fontWeight: 400 }}>
                  {labels.orderSummary}
                </h3>

                <div style={{ display: "grid", gap: "10px", fontSize: "14px" }}>
                  <p><strong>{labels.customerName}:</strong> {order.customerName}</p>
                  <p><strong>{labels.phone}:</strong> {order.phoneNumber}</p>
                  <p><strong>{labels.address}:</strong> {zone ? textByLanguage(language, zone.nameAr, zone.nameHe) : ""} - {order.detailedAddress}</p>
                  {order.notes && <p><strong>{labels.notes}:</strong> {order.notes}</p>}
                </div>

                <h4 style={{ color: "var(--gold)", fontSize: "16px", margin: "10px 0 0", fontWeight: 400 }}>
                  {labels.itemsOrdered}
                </h4>

                <div style={{ display: "grid", gap: "10px", borderBottom: "1px dashed var(--line)", paddingBottom: "16px" }}>
                  {order.items.map((item, idx) => {
                    const prod = storeData.products.find((p) => p.id === item.productId);
                    const col = storeData.colors.find((c) => c.id === item.colorId);
                    return (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                        <span>
                          {prod ? textByLanguage(language, prod.nameAr, prod.nameHe) : "منتج"} 
                          <span style={{ color: "var(--muted)", marginInlineStart: "6px" }}>
                            [اللون: {col ? textByLanguage(language, col.nameAr, col.nameHe) : "-"}]
                          </span>
                          <strong> × {item.quantity}</strong>
                        </span>
                        <strong>{formatPrice(item.price * item.quantity)}</strong>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "grid", gap: "8px", fontSize: "14px", color: "var(--muted)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{labels.subtotal}</span>
                    <strong style={{ color: "#fff" }}>{formatPrice(order.subtotal)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{labels.deliveryFee}</span>
                    <strong style={{ color: "#fff" }}>{formatPrice(order.deliveryFee)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", color: "var(--gold)", paddingTop: "10px", borderTop: "1px solid var(--line)" }}>
                    <span>{labels.total}</span>
                    <strong>{formatPrice(order.totalPrice)}</strong>
                  </div>
                </div>
              </div>

              <Link href="/" style={{
                border: "1px solid var(--line)",
                color: "var(--muted)",
                padding: "12px 36px",
                borderRadius: "25px",
                fontSize: "13px",
                fontWeight: 700,
                marginTop: "10px"
              }} onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--gold)";
                e.currentTarget.style.borderColor = "var(--gold)";
              }} onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--muted)";
                e.currentTarget.style.borderColor = "var(--line)";
              }}>
                {labels.backToHome}
              </Link>
            </>
          ) : (
            <div style={{ padding: "80px 20px", display: "grid", gap: "20px", justifyItems: "center" }}>
              <p style={{ color: "var(--muted)" }}>{labels.orderNotFound}</p>
              <Link href="/" style={{
                background: "var(--gold)",
                color: "var(--ivory)",
                padding: "12px 30px",
                borderRadius: "25px",
                fontWeight: 700,
                fontSize: "13px"
              }}>
                {labels.backToHome}
              </Link>
            </div>
          )}

        </div>
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
