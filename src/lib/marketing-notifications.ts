export type MarketingNotificationAudience = "all" | "cart";

export type MarketingNotificationDraft = {
  titleAr: string;
  titleHe: string;
  bodyAr: string;
  bodyHe: string;
  url: string;
  audience: MarketingNotificationAudience;
  templateId?: string;
};

export type MarketingNotificationTemplate = {
  id: string;
  labelAr: string;
  labelHe: string;
  descriptionAr: string;
  draft: Omit<MarketingNotificationDraft, "templateId">;
};

export const marketingNotificationTemplates: MarketingNotificationTemplate[] = [
  {
    id: "new_arrivals",
    labelAr: "وصل حديثًا",
    labelHe: "חדש",
    descriptionAr: "إشعار بتشكيلة أو منتجات جديدة.",
    draft: {
      titleAr: "وصل حديثًا إلى Flora Style",
      titleHe: "חדש ב-Flora Style",
      bodyAr: "اكتشفي أحدث القطع المختارة — تشكيلة جديدة بانتظارك الآن.",
      bodyHe: "גלי את הפריטים החדשים שנבחרו במיוחד — אוסף חדש מחכה לך.",
      url: "/shop?sort=newest",
      audience: "all",
    },
  },
  {
    id: "offers",
    labelAr: "عروض",
    labelHe: "מבצעים",
    descriptionAr: "إشعار بعروض وتخفيضات محدودة.",
    draft: {
      titleAr: "عروض Flora Style الحصرية",
      titleHe: "מבצעים בלעדיים ב-Flora Style",
      bodyAr: "لفترة محدودة — اكتشفي عروضنا على الحقائب والإكسسوارات والساعات.",
      bodyHe: "לזמן מוגבל — גלי את המבצעים שלנו על תיקים, אביזרים ושעונים.",
      url: "/shop",
      audience: "all",
    },
  },
  {
    id: "coupons",
    labelAr: "كوبونات خصم",
    labelHe: "קופונים",
    descriptionAr: "إشعار بكود خصم — عدّل النص قبل الإرسال.",
    draft: {
      titleAr: "كوبون خصم خاص لكِ",
      titleHe: "קופון הנחה מיוחד בשבילך",
      bodyAr: "استخدمي كود FLORA10 عند الطلب واحصلي على خصم مميز لفترة محدودة.",
      bodyHe: "השתמשי בקוד FLORA10 בהזמנה וקבלי הנחה מיוחדת לזמן מוגבל.",
      url: "/shop",
      audience: "all",
    },
  },
  {
    id: "cart_reminder",
    labelAr: "تذكير بسلة المشتريات",
    labelHe: "תזכורת עגלה",
    descriptionAr: "يُرسل فقط للمشتركين الذين لديهم منتجات في السلة.",
    draft: {
      titleAr: "سلتكِ ما زالت بانتظارك",
      titleHe: "העגלה שלך עדיין מחכה",
      bodyAr: "أكملي طلبك الآن قبل نفاد المقاس أو اللون المفضل لديك.",
      bodyHe: "השלימי את ההזמנה עכשיו לפני שיגמר המידה או הצבע המועדף עלייך.",
      url: "/checkout",
      audience: "cart",
    },
  },
];

export function getMarketingNotificationTemplate(id: string) {
  return marketingNotificationTemplates.find((template) => template.id === id);
}
