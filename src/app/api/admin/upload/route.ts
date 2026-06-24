import { NextResponse } from "next/server";
import { isAcceptedImageFile, resolveImageContentType } from "@/lib/image-upload";
import { requireAdminAccess } from "@/lib/supabase/admin-access";
import { createServiceSupabaseClient, isServiceRoleConfigured } from "@/lib/supabase/service";

const STORAGE_BUCKET = "flora-assets";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FOLDERS = new Set(["products", "categories", "brands", "banners"]);

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (access.error) {
    return access.error;
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json(
      { error: "إعدادات رفع الصور غير مكتملة على السيرفر. تواصل مع الدعم الفني." },
      { status: 500 }
    );
  }

  const service = createServiceSupabaseClient();
  if (!service) {
    return NextResponse.json({ error: "تعذر تجهيز خدمة رفع الصور." }, { status: 500 });
  }

  const formData = await request.formData();
  const fileEntry = formData.get("file");
  const folder = String(formData.get("folder") ?? "").trim();

  if (!(fileEntry instanceof File) || !fileEntry.size) {
    return NextResponse.json({ error: "لم يتم اختيار ملف صورة صالح." }, { status: 400 });
  }

  if (!ALLOWED_FOLDERS.has(folder)) {
    return NextResponse.json({ error: "مجلد الرفع غير مسموح." }, { status: 400 });
  }

  if (fileEntry.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "حجم الصورة أكبر من 10 ميغابايت." }, { status: 400 });
  }

  if (!isAcceptedImageFile(fileEntry)) {
    return NextResponse.json(
      { error: "الملف المختار ليس صورة مدعومة. جرّبي PNG أو JPG أو WEBP أو HEIC أو GIF." },
      { status: 400 }
    );
  }

  const contentType = resolveImageContentType(fileEntry);
  if (!contentType) {
    return NextResponse.json(
      { error: "تعذر تحديد نوع الصورة. غيّري امتداد الملف أو جرّبي صيغة أخرى." },
      { status: 400 }
    );
  }

  const safeName = sanitizeFileName(fileEntry.name || "asset");
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

  const { error: uploadError } = await service.storage.from(STORAGE_BUCKET).upload(path, fileEntry, {
    cacheControl: "3600",
    contentType,
    upsert: false,
  });

  if (uploadError) {
    const message = uploadError.message.toLowerCase();
    if (message.includes("bucket") && message.includes("not found")) {
      return NextResponse.json(
        { error: "مساحة تخزين الصور غير مهيأة بعد في قاعدة البيانات." },
        { status: 500 }
      );
    }

    if (message.includes("row-level security")) {
      return NextResponse.json(
        {
          error:
            "تعذر رفع الصورة بسبب إعدادات السيرفر. تأكدي من إضافة SUPABASE_SERVICE_ROLE_KEY الصحيح على Vercel ثم أعيدي النشر.",
        },
        { status: 500 }
      );
    }

    if (message.includes("mime") || message.includes("content type")) {
      return NextResponse.json(
        {
          error:
            "تخزين الصور يرفض نوع الملف. شغّلي سكربت scripts/allow-all-image-formats.sql في Supabase ثم أعيدي المحاولة.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data } = service.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
