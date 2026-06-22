import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { Banner, Brand, Category, DeliveryZone, Product, ProductColor, StoreSettings } from "@/lib/store";
import { requireAdminAccess } from "@/lib/supabase/admin-access";
import {
  serverDeleteBrand,
  serverDeleteEntity,
  serverRepairCatalogLinks,
  serverSaveSettings,
  serverUpsertBanner,
  serverUpsertBrand,
  serverUpsertCategory,
  serverUpsertColor,
  serverUpsertDeliveryZone,
  serverUpsertProduct,
} from "@/lib/supabase/admin-server";
import { isServiceRoleConfigured } from "@/lib/supabase/service";

type CatalogBody =
  | { action: "upsertCategory"; payload: Category }
  | { action: "upsertBrand"; payload: Brand }
  | { action: "upsertProduct"; payload: { product: Product; defaultStock?: number } }
  | { action: "upsertColor"; payload: ProductColor }
  | { action: "upsertDeliveryZone"; payload: DeliveryZone }
  | { action: "upsertBanner"; payload: Banner }
  | { action: "saveSettings"; payload: StoreSettings }
  | { action: "deleteEntity"; payload: { table: Parameters<typeof serverDeleteEntity>[0]; id: string } }
  | { action: "deleteBrand"; payload: { id: string } }
  | { action: "repairCatalog" };

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (access.error) {
    return access.error;
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json(
      { error: "إعدادات السيرفر غير مكتملة. أضيفي SUPABASE_SERVICE_ROLE_KEY على Vercel ثم أعيدي النشر." },
      { status: 500 }
    );
  }

  let body: CatalogBody;
  try {
    body = (await request.json()) as CatalogBody;
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  try {
    switch (body.action) {
      case "upsertCategory":
        await serverUpsertCategory(body.payload);
        break;
      case "upsertBrand":
        await serverUpsertBrand(body.payload);
        break;
      case "upsertProduct":
        await serverUpsertProduct(body.payload.product, { defaultStock: body.payload.defaultStock });
        break;
      case "upsertColor":
        await serverUpsertColor(body.payload);
        break;
      case "upsertDeliveryZone":
        await serverUpsertDeliveryZone(body.payload);
        break;
      case "upsertBanner":
        await serverUpsertBanner(body.payload);
        break;
      case "saveSettings":
        await serverSaveSettings(body.payload);
        break;
      case "deleteEntity":
        await serverDeleteEntity(body.payload.table, body.payload.id);
        break;
      case "deleteBrand":
        await serverDeleteBrand(body.payload.id);
        break;
      case "repairCatalog":
        await serverRepairCatalogLinks();
        break;
      default:
        return NextResponse.json({ error: "إجراء غير مدعوم." }, { status: 400 });
    }

    revalidatePath("/", "layout");
    revalidatePath("/shop");
    revalidatePath("/checkout");
    revalidatePath("/products", "layout");

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تنفيذ العملية.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
