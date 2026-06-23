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

type OneSignalSegmentsResponse = {
  segments?: Array<{ name?: string }>;
};

export type OneSignalDiagnostics = {
  configured: boolean;
  appId: string;
  apiKeyPresent: boolean;
  segments: string[];
  subscriptionCount: number;
  apiReachable: boolean;
  issue?: string;
};

function getOneSignalAppId() {
  return process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim() ?? process.env.ONESIGNAL_APP_ID?.trim() ?? "";
}

function normalizeApiKey(raw: string) {
  return raw.trim().replace(/^key\s+/i, "");
}

function getOneSignalRestApiKey() {
  const raw =
    process.env.ONESIGNAL_REST_API_KEY?.trim() ??
    process.env.ONESIGNAL_APP_API_KEY?.trim() ??
    process.env.ONESIGNAL_API_KEY?.trim() ??
    "";
  return normalizeApiKey(raw);
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

function authHeaders(apiKey: string) {
  return {
    Authorization: `Key ${apiKey}`,
    "Content-Type": "application/json; charset=utf-8",
  };
}

async function fetchSegmentNames(appId: string, apiKey: string) {
  const response = await fetch(`https://api.onesignal.com/apps/${appId}/segments?limit=50`, {
    headers: { Authorization: `Key ${apiKey}` },
  });

  if (!response.ok) return [];

  const payload = (await response.json().catch(() => ({}))) as OneSignalSegmentsResponse;
  return (payload.segments ?? []).map((segment) => segment.name?.trim()).filter(Boolean) as string[];
}

async function fetchSubscribedSubscriptionIds(appId: string, apiKey: string) {
  const response = await fetch(`https://api.onesignal.com/api/v1/players?app_id=${appId}&limit=200&offset=0`, {
    headers: { Authorization: `Key ${apiKey}` },
  });

  if (!response.ok) return [];

  const payload = (await response.json().catch(() => ({}))) as OneSignalPlayersResponse;
  return (payload.players ?? [])
    .filter((player) => player.id && player.invalid_identifier !== true && player.invalid_identifier !== "t")
    .map((player) => player.id as string);
}

async function postOneSignalNotification(payload: Record<string, unknown>, apiKey: string) {
  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify(payload),
  });

  const result = (await response.json().catch(() => ({}))) as OneSignalNotificationResponse;
  return { response, result };
}

function buildAudienceStrategies(
  appId: string,
  base: Record<string, unknown>,
  audience: "all" | "cart",
  segmentNames: string[],
  subscriptionIds: string[]
) {
  const strategies: Array<Record<string, unknown>> = [];
  const resolvedUrl = base.web_url as string;

  const minimalBase = {
    app_id: appId,
    target_channel: "push",
    headings: base.headings,
    contents: base.contents,
    web_url: resolvedUrl,
    name: base.name,
  };

  if (audience === "cart") {
    strategies.push({
      ...minimalBase,
      filters: [{ field: "tag", key: "has_cart", relation: "=", value: "true" }],
    });
    return strategies;
  }

  const preferredSegments = [
    "Subscribed Users",
    "All Subscriptions",
    "Total Subscriptions",
    "All",
    ...segmentNames,
  ];

  const uniqueSegments = [...new Set(preferredSegments.map((name) => name.trim()).filter(Boolean))];

  for (const segment of uniqueSegments) {
    strategies.push({
      ...minimalBase,
      included_segments: [segment],
    });
  }

  if (subscriptionIds.length) {
    strategies.push({
      ...minimalBase,
      include_subscription_ids: subscriptionIds.slice(0, 200),
    });
  }

  strategies.push({
    ...minimalBase,
    isIos: false,
    isAndroid: false,
    isHuawei: false,
    isWP_WNS: false,
    isAdm: false,
    isAnyWeb: true,
    isChromeWeb: true,
    isFirefox: true,
    isSafari: true,
    included_segments: ["Subscribed Users"],
  });

  return strategies;
}

async function sendWithStrategies(
  appId: string,
  apiKey: string,
  base: Record<string, unknown>,
  audience: "all" | "cart"
) {
  const [segmentNames, subscriptionIds] = await Promise.all([
    fetchSegmentNames(appId, apiKey),
    audience === "all" ? fetchSubscribedSubscriptionIds(appId, apiKey) : Promise.resolve([]),
  ]);

  const strategies = buildAudienceStrategies(appId, base, audience, segmentNames, subscriptionIds);

  let lastError =
    "لم يتم إنشاء الإشعار. تأكدي أن REST API Key و App ID من نفس تطبيق OneSignal الذي فيه المشتركين.";

  for (const payload of strategies) {
    const { response, result } = await postOneSignalNotification(payload, apiKey);

    if (result.id) {
      return { id: result.id };
    }

    const formatted = formatOneSignalErrors(result.errors);
    if (formatted) {
      lastError = formatted;
      if (/api key|authorization|unauthorized|access denied|invalid/i.test(formatted)) {
        throw new Error(
          "مفتاح OneSignal غير صحيح. من Settings → Keys & IDs انسخي App API Key (يبدأ غالباً بـ os_v2_app_) بدون كلمة Key في Vercel."
        );
      }
    } else if (!response.ok) {
      lastError = "تعذر إرسال الإشعار عبر OneSignal.";
    }

    const warning = result.warnings?.join(" ");
    if (warning) lastError = warning;
  }

  throw new Error(lastError);
}

export async function getOneSignalDiagnostics(): Promise<OneSignalDiagnostics> {
  const appId = getOneSignalAppId();
  const apiKey = getOneSignalRestApiKey();

  if (!appId || !apiKey) {
    return {
      configured: false,
      appId,
      apiKeyPresent: Boolean(apiKey),
      segments: [],
      subscriptionCount: 0,
      apiReachable: false,
      issue: "ONESIGNAL_REST_API_KEY أو NEXT_PUBLIC_ONESIGNAL_APP_ID غير مضاف في Vercel.",
    };
  }

  const [segmentNames, subscriptionIds] = await Promise.all([
    fetchSegmentNames(appId, apiKey),
    fetchSubscribedSubscriptionIds(appId, apiKey),
  ]);

  let issue: string | undefined;
  if (!segmentNames.length && !subscriptionIds.length) {
    issue =
      "المفتاح أو App ID لا يطابقان تطبيق OneSignal الصحيح. Dashboard يعمل لكن API يستهدف تطبيقاً بلا مشتركين.";
  }

  return {
    configured: true,
    appId,
    apiKeyPresent: true,
    segments: segmentNames,
    subscriptionCount: subscriptionIds.length,
    apiReachable: segmentNames.length > 0 || subscriptionIds.length > 0,
    issue,
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

  const resolvedUrl = resolveNotificationUrl(input.url);
  const base = {
    name: input.templateId ? `flora-${input.templateId}` : "flora-marketing-push",
    headings: buildLocalizedField(titleAr, titleHe),
    contents: buildLocalizedField(bodyAr, bodyHe),
    web_url: resolvedUrl,
  };

  const result = await sendWithStrategies(appId, apiKey, base, input.audience);

  return {
    id: result.id,
    audience: input.audience,
  };
}
