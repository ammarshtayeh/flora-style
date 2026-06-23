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
  errors?: string[] | Record<string, unknown>;
  warnings?: string[];
};

type OneSignalPlayersResponse = {
  players?: Array<{ id?: string; invalid_identifier?: boolean | string }>;
  total_count?: number;
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

function formatOneSignalErrors(errors: OneSignalNotificationResponse["errors"]) {
  if (!errors) return "";
  if (Array.isArray(errors)) return errors.join(" ");
  return Object.values(errors)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => String(value))
    .join(" ");
}

function buildWebPushPayload(
  base: Record<string, unknown>,
  audience: "all" | "cart"
): Record<string, unknown> {
  const resolvedUrl = base.url as string;
  const payload: Record<string, unknown> = {
    ...base,
    target_channel: "push",
    url: resolvedUrl,
    web_url: resolvedUrl,
    isIos: false,
    isAndroid: false,
    isHuawei: false,
    isWP_WNS: false,
    isAdm: false,
    isAnyWeb: true,
    isChromeWeb: true,
    isFirefox: true,
    isSafari: true,
  };

  if (audience === "cart") {
    payload.filters = [{ field: "tag", key: "has_cart", relation: "=", value: "true" }];
  }

  return payload;
}

async function postOneSignalNotification(payload: Record<string, unknown>, apiKey: string) {
  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const result = (await response.json().catch(() => ({}))) as OneSignalNotificationResponse;
  return { response, result };
}

async function fetchSubscribedWebSubscriptionIds(appId: string, apiKey: string) {
  const response = await fetch(`https://api.onesignal.com/api/v1/players?app_id=${appId}&limit=200&offset=0`, {
    headers: {
      Authorization: `Key ${apiKey}`,
    },
  });

  if (!response.ok) return [];

  const payload = (await response.json().catch(() => ({}))) as OneSignalPlayersResponse;
  return (payload.players ?? [])
    .filter((player) => player.id && player.invalid_identifier !== true && player.invalid_identifier !== "t")
    .map((player) => player.id as string);
}

async function sendWithStrategies(
  appId: string,
  apiKey: string,
  base: Record<string, unknown>,
  audience: "all" | "cart"
) {
  const strategies: Array<Record<string, unknown>> = [];

  if (audience === "all") {
    for (const segment of ["Subscribed Users", "All", "Total Subscriptions", "All Subscriptions"]) {
      strategies.push({
        ...buildWebPushPayload(base, audience),
        included_segments: [segment],
      });
    }
  } else {
    strategies.push(buildWebPushPayload(base, audience));
  }

  const subscriptionIds = audience === "all" ? await fetchSubscribedWebSubscriptionIds(appId, apiKey) : [];
  if (subscriptionIds.length) {
    strategies.push({
      ...buildWebPushPayload(base, audience),
      include_subscription_ids: subscriptionIds.slice(0, 200),
    });
  }

  let lastError = "لم يتم إنشاء الإشعار. تأكدي من وجود مشتركين مفعّلين للإشعارات.";

  for (const payload of strategies) {
    const { response, result } = await postOneSignalNotification({ app_id: appId, ...payload }, apiKey);

    if (result.id) {
      return { id: result.id };
    }

    const formatted = formatOneSignalErrors(result.errors);
    if (formatted) {
      lastError = formatted;
      if (/api key|authorization|unauthorized/i.test(formatted)) {
        throw new Error(
          "مفتاح OneSignal غير صحيح. استخدمي REST API Key من Settings → Keys & IDs وليس Organization API Key."
        );
      }
    } else if (!response.ok) {
      lastError = formatted || "تعذر إرسال الإشعار عبر OneSignal.";
    }

    const warning = result.warnings?.join(" ");
    if (warning) lastError = warning;
  }

  throw new Error(lastError);
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

  const resolvedUrl = resolveNotificationUrl(input.url);
  const base = {
    name: input.templateId ? `flora-${input.templateId}` : "flora-marketing-push",
    headings: buildLocalizedField(titleAr, titleHe),
    contents: buildLocalizedField(bodyAr, bodyHe),
    url: resolvedUrl,
    chrome_web_image: `${getSiteUrl()}/flora-logo.png`,
  };

  const result = await sendWithStrategies(appId, apiKey, base, input.audience);

  return {
    id: result.id,
    audience: input.audience,
  };
}
