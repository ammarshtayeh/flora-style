type AdminEntityKey =
  | "products"
  | "categories"
  | "brands"
  | "colors"
  | "deliveryZones"
  | "banners"
  | "orders"
  | "settings";

const entityLabels: Record<AdminEntityKey, string> = {
  products: "المنتج",
  categories: "التصنيف",
  brands: "البراند",
  colors: "اللون والمخزون",
  deliveryZones: "منطقة التوصيل",
  banners: "البانر",
  orders: "الطلب",
  settings: "إعدادات المتجر",
};

export function adminSaveMessage(entity: AdminEntityKey) {
  return `تم حفظ ${entityLabels[entity]} في قاعدة البيانات بنجاح.`;
}

export function adminDeleteMessage(entity: AdminEntityKey) {
  return `تم حذف ${entityLabels[entity]} من قاعدة البيانات بنجاح.`;
}

const knownErrorMessages: Record<string, string> = {
  Unauthorized: "غير مصرح لك بتنفيذ هذا الإجراء.",
  Forbidden: "ليس لديك صلاحية لتنفيذ هذا الإجراء.",
  "هذا الحساب غير مسجّل كأدمن. يمكن الدخول فقط بحسابات الأدمن المعتمدة.":
    "هذا الحساب غير مسجّل كأدمن. يمكن الدخول فقط بحسابات الأدمن المعتمدة.",
  "Invalid login credentials": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  "Email not confirmed": "الحساب غير مفعّل بعد.",
  "User already registered": "هذا البريد الإلكتروني مستخدم مسبقاً.",
  "Failed to create auth user.": "تعذر إنشاء حساب الأدمن. تحقق من البيانات وحاول مرة أخرى.",
  "SUPABASE_SERVICE_ROLE_KEY is required to create additional admin accounts.":
    "إعدادات السيرفر غير مكتملة لإنشاء حسابات أدمن جديدة. تواصل مع الدعم الفني.",
  "Supabase is not configured.": "قاعدة البيانات غير متصلة حالياً.",
  "Service client is unavailable.": "تعذر الاتصال بخدمة الإدارة حالياً.",
};

export function formatAdminError(error: unknown, fallback: string) {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : typeof error === "object" && error && "error" in error && typeof (error as { error: unknown }).error === "string"
          ? (error as { error: string }).error
          : "";

  if (!raw) {
    return fallback;
  }

  if (knownErrorMessages[raw]) {
    return knownErrorMessages[raw];
  }

  const lowered = raw.toLowerCase();
  if (lowered.includes("supabase") || lowered.includes("service_role") || lowered.includes(".env")) {
    return fallback;
  }

  if (lowered.includes("network") || lowered.includes("fetch")) {
    return "تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.";
  }

  if (lowered.includes("jwt") || lowered.includes("token")) {
    return "انتهت صلاحية الجلسة. سجّل الدخول مرة أخرى.";
  }

  if (lowered.includes("row-level security") || lowered.includes("not allowed")) {
    return "تعذر تنفيذ العملية. تأكدي من تسجيل الدخول بحساب أدمن معتمد، ومن إعداد SUPABASE_SERVICE_ROLE_KEY على Vercel.";
  }

  if (lowered.includes("mime") || lowered.includes("content type")) {
    return "نوع الصورة غير مدعوم. جرّبي PNG أو JPG أو WEBP أو HEIC أو GIF، أو شغّلي سكربت allow-all-image-formats.sql في Supabase.";
  }

  if (lowered.includes("bucket") && lowered.includes("not found")) {
    return "مساحة تخزين الصور غير مهيأة بعد في قاعدة البيانات.";
  }

  return raw;
}
