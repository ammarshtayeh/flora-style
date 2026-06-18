import type { StoreSettings } from "@/lib/store";

export function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, "");
}

export function formatPhoneDisplay(value: string) {
  const digits = normalizePhoneNumber(value);
  if (!digits) return value;

  if (digits.startsWith("972") && digits.length >= 11) {
    return `+972 ${digits.slice(3, 5)}-${digits.slice(5, 8)}-${digits.slice(8)}`;
  }

  return value.startsWith("+") ? value : `+${digits}`;
}

export function getWhatsAppHref(value: string) {
  const digits = normalizePhoneNumber(value);
  return digits ? `https://wa.me/${digits}` : "#";
}

export function hasContactValue(value?: string) {
  return Boolean(value?.trim());
}

export function getStoreContactLinks(settings: StoreSettings) {
  const links = [];

  if (hasContactValue(settings.whatsappNumber)) {
    links.push({
      id: "whatsapp",
      href: getWhatsAppHref(settings.whatsappNumber),
      label: formatPhoneDisplay(settings.whatsappNumber),
      external: true,
    });
  }

  if (hasContactValue(settings.instagramUrl)) {
    links.push({
      id: "instagram",
      href: settings.instagramUrl.trim(),
      label: "Instagram",
      external: true,
    });
  }

  if (hasContactValue(settings.tiktokUrl)) {
    links.push({
      id: "tiktok",
      href: settings.tiktokUrl.trim(),
      label: "TikTok",
      external: true,
    });
  }

  if (hasContactValue(settings.facebookUrl)) {
    links.push({
      id: "facebook",
      href: settings.facebookUrl.trim(),
      label: "Facebook",
      external: true,
    });
  }

  if (hasContactValue(settings.email)) {
    links.push({
      id: "email",
      href: `mailto:${settings.email.trim()}`,
      label: settings.email.trim(),
      external: false,
    });
  }

  return links;
}
