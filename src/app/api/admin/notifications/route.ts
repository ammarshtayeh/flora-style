import { NextResponse } from "next/server";
import { getMarketingNotificationTemplate } from "@/lib/marketing-notifications";
import { getOneSignalDiagnostics, isOneSignalServerConfigured, sendMarketingPushNotification } from "@/lib/onesignal-server";
import { requireAdminAccess } from "@/lib/supabase/admin-access";

type NotificationBody = {
  titleAr?: string;
  titleHe?: string;
  bodyAr?: string;
  bodyHe?: string;
  url?: string;
  audience?: "all" | "cart";
  templateId?: string;
};

export async function GET() {
  const access = await requireAdminAccess();
  if (access.error) return access.error;

  const diagnostics = await getOneSignalDiagnostics();

  return NextResponse.json({
    configured: isOneSignalServerConfigured(),
    diagnostics,
    templates: ["new_arrivals", "offers", "coupons", "cart_reminder"],
  });
}

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (access.error) return access.error;

  if (!isOneSignalServerConfigured()) {
    return NextResponse.json(
      {
        error:
          "إعدادات OneSignal غير مكتملة. أضف ONESIGNAL_REST_API_KEY في Vercel مع NEXT_PUBLIC_ONESIGNAL_APP_ID ثم أعد النشر.",
      },
      { status: 500 }
    );
  }

  let body: NotificationBody;
  try {
    body = (await request.json()) as NotificationBody;
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const template = body.templateId ? getMarketingNotificationTemplate(body.templateId) : undefined;
  const draft = template?.draft;

  const titleAr = (body.titleAr ?? draft?.titleAr ?? "").trim();
  const titleHe = (body.titleHe ?? draft?.titleHe ?? titleAr).trim();
  const messageAr = (body.bodyAr ?? draft?.bodyAr ?? "").trim();
  const messageHe = (body.bodyHe ?? draft?.bodyHe ?? messageAr).trim();
  const url = (body.url ?? draft?.url ?? "/shop").trim();
  const audience = body.audience ?? draft?.audience ?? "all";

  if (!titleAr || !messageAr) {
    return NextResponse.json({ error: "عنوان الإشعار ونص الإشعار مطلوبان." }, { status: 400 });
  }

  if (audience !== "all" && audience !== "cart") {
    return NextResponse.json({ error: "نوع الجمهور غير صالح." }, { status: 400 });
  }

  try {
    const result = await sendMarketingPushNotification({
      titleAr,
      titleHe,
      bodyAr: messageAr,
      bodyHe: messageHe,
      url,
      audience,
      templateId: body.templateId,
    });

    return NextResponse.json({
      ok: true,
      id: result.id,
      audience: result.audience,
      message:
        audience === "cart"
          ? "تم إرسال تذكير السلة للمشتركين الذين لديهم منتجات في السلة."
          : "تم إرسال الإشعار إلى المشتركين المفعّلين.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر إرسال الإشعار.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
