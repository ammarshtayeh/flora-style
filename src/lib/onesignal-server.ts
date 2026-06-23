import { getSiteUrl } from "@/lib/site";

type SendMarketingNotificationInput = {
  titleAr: string;
  titleHe: string;
  bodyAr: string;
  bodyHe: string;
  url: string;
  audience: "all" | "cart";
  templateId?: string;
};

type OneSignalNotificationResponse = {
  id?: string;
  errors?: string[];
  warnings?: string[];
};

function getOneSignalAppId() {
  return process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim() ?? process.env.ONESIGNAL_APP_ID?.trim() ?? "";
}

function getOneSignalRestApiKey() {
  return process.env.ONESIGNAL_REST_API_KEY?.trim() ?? "";
}

export function isOneSignalServerConfigured() {
  return Boolean(getOneSignalAppId() && getOneSignalRestApiKey());
}

function resolveNotificationUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return getSiteUrl();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${getSiteUrl()}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

function buildLocalizedField(ar: string, he: string) {
  const en = ar || he;
  return {
    en,
    ar: ar || en,
    he: he || en,
  };
}

export async function sendMarketingPushNotification(input: SendMarketingNotificationInput) {
  const appId = getOneSignalAppId();
  const apiKey = getOneSignalRestApiKey();

  if (!appId || !apiKey) {
    throw new Error("إعدادات OneSignal غير مكتملة. أضيفي ONESIGNAL_REST_API_KEY و NEXT_PUBLIC_ONESIGNAL_APP_ID على Vercel.");
  }

  const titleAr = input.titleAr.trim();
  const bodyAr = input.bodyAr.trim();
  const titleHe = input.titleHe.trim() || titleAr;
  const bodyHe = input.bodyHe.trim() || bodyAr;

  if (!titleAr || !bodyAr) {
    throw new Error("عنوان الإشعار ونص الإشعار مطلوبان.");
  }

  const payload: Record<string, unknown> = {
    app_id: appId,
    target_channel: "push",
    name: input.templateId ? `flora-${input.templateId}` : "flora-marketing-push",
    headings: buildLocalizedField(titleAr, titleHe),
    contents: buildLocalizedField(bodyAr, bodyHe),
    url: resolveNotificationUrl(input.url),
    chrome_web_image: `${getSiteUrl()}/flora-logo.png`,
  };

  if (input.audience === "cart") {
    payload.filters = [{ field: "tag", key: "has_cart", relation: "=", value: "true" }];
  } else {
    payload.included_segments = ["Subscribed Users"];
  }

  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const result = (await response.json().catch(() => ({}))) as OneSignalNotificationResponse;

  if (!response.ok) {
    const message = result.errors?.join(" ") || "تعذر إرسال الإشعار عبر OneSignal.";
    throw new Error(message);
  }

  if (!result.id) {
    const warning = result.warnings?.join(" ");
    if (warning) throw new Error(warning);
    throw new Error("لم يتم إنشاء الإشعار. تأكدي من وجود مشتركين مفعّلين للإشعارات.");
  }

  return {
    id: result.id,
    audience: input.audience,
  };
}
