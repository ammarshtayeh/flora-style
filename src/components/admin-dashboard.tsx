"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Banner,
  Brand,
  Category,
  DeliveryZone,
  formatPrice,
  initialStoreData,
  OrderStatus,
  Product,
  ProductColor,
  StoreData,
  StoreSettings
} from "@/lib/store";
import { loadStoreData, saveStoreData, subscribeToStoreData } from "@/lib/db";

type AdminTab = "overview" | "products" | "inventory" | "orders" | "categories" | "brands" | "delivery" | "banners" | "settings";

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "overview", label: "نظرة عامة" },
  { id: "products", label: "المنتجات" },
  { id: "inventory", label: "المخزون والألوان" },
  { id: "orders", label: "الطلبات" },
  { id: "categories", label: "التصنيفات" },
  { id: "brands", label: "البراندات" },
  { id: "delivery", label: "التوصيل" },
  { id: "banners", label: "البانرات" },
  { id: "settings", label: "الإعدادات" }
];

const statuses: OrderStatus[] = ["Pending", "Confirmed", "Processing", "Delivered", "Cancelled"];

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function textInput<T extends object>(
  label: string,
  value: string | number,
  field: keyof T,
  setDraft: React.Dispatch<React.SetStateAction<any>>,
  type = "text"
) {
  return (
    <label className="form-row">
      <span>{label}</span>
      <input
        className="field"
        type={type}
        value={value}
        onChange={(event) =>
          setDraft((draft: any) => ({
            ...draft,
            [field]: type === "number" ? Number(event.target.value) : event.target.value
          }))
        }
      />
    </label>
  );
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [data, setData] = useState<StoreData>(initialStoreData);
  const [loaded, setLoaded] = useState(false);
  
  const [productDraft, setProductDraft] = useState<Product>(() => blankProduct(data.categories[0]?.id, data.brands[0]?.id));
  const [categoryDraft, setCategoryDraft] = useState<Category>(() => blankCategory());
  const [brandDraft, setBrandDraft] = useState<Brand>(() => blankBrand());
  const [colorDraft, setColorDraft] = useState<ProductColor>(() => blankColor(data.products[0]?.id ?? ""));
  const [zoneDraft, setZoneDraft] = useState<DeliveryZone>(() => blankZone());
  const [bannerDraft, setBannerDraft] = useState<Banner>(() => blankBanner());
  const [settingsDraft, setSettingsDraft] = useState<StoreSettings>(data.settings);

  // Sync state with local storage updates
  useEffect(() => {
    setData(loadStoreData());
    setLoaded(true);
    const unsub = subscribeToStoreData((fresh) => {
      setData(fresh);
      setSettingsDraft(fresh.settings);
    });
    return () => unsub();
  }, []);

  // Save changes locally and notify subscribers
  useEffect(() => {
    if (loaded) {
      saveStoreData(data, { notify: false });
    }
  }, [data, loaded]);

  const stats = useMemo(() => {
    const totalSales = data.orders
      .filter((order) => order.status !== "Cancelled")
      .reduce((sum, order) => sum + order.totalPrice, 0);
    const lowStock = data.colors.filter((color) => color.stockQuantity > 0 && color.stockQuantity <= 3);
    const outOfStock = data.colors.filter((color) => color.stockQuantity === 0);
    return { totalSales, lowStock, outOfStock };
  }, [data]);

  function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setData((current) => {
      const exists = current.products.some((product) => product.id === productDraft.id);
      return {
        ...current,
        products: exists
          ? current.products.map((product) => (product.id === productDraft.id ? productDraft : product))
          : [{ ...productDraft, id: uid("prod"), createdAt: new Date().toISOString().slice(0, 10) }, ...current.products]
      };
    });
    setProductDraft(blankProduct(data.categories[0]?.id, data.brands[0]?.id));
  }

  function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setData((current) => upsert(current, "categories", categoryDraft, blankCategory));
    setCategoryDraft(blankCategory());
  }

  function saveBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setData((current) => upsert(current, "brands", brandDraft, blankBrand));
    setBrandDraft(blankBrand());
  }

  function saveColor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setData((current) => upsert(current, "colors", colorDraft, () => blankColor(current.products[0]?.id ?? "")));
    setColorDraft(blankColor(data.products[0]?.id ?? ""));
  }

  function saveZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setData((current) => upsert(current, "deliveryZones", zoneDraft, blankZone));
    setZoneDraft(blankZone());
  }

  function saveBanner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setData((current) => upsert(current, "banners", bannerDraft, blankBanner));
    setBannerDraft(blankBanner());
  }

  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setData((current) => ({ ...current, settings: settingsDraft }));
  }

  function deleteById(key: keyof Pick<StoreData, "products" | "categories" | "brands" | "colors" | "deliveryZones" | "banners" | "orders">, id: string) {
    setData((current) => ({
      ...current,
      [key]: current[key].filter((item: any) => item.id !== id)
    }));
  }

  // Automatic Stock Deduction logic when orders are Confirmed
  function updateOrderStatus(orderId: string, status: OrderStatus) {
    setData((current) => {
      const orderIndex = current.orders.findIndex((o) => o.id === orderId);
      if (orderIndex === -1) return current;

      const order = current.orders[orderIndex];
      let updatedColors = [...current.colors];
      let stockDeducted = order.stockDeducted;

      // 1. Deduct stock if status changes to Confirmed and stock was NOT deducted yet
      if (status === "Confirmed" && !order.stockDeducted) {
        updatedColors = current.colors.map((color) => {
          const orderedItem = order.items.find((item) => item.colorId === color.id);
          if (orderedItem) {
            return {
              ...color,
              stockQuantity: Math.max(0, color.stockQuantity - orderedItem.quantity)
            };
          }
          return color;
        });
        stockDeducted = true;
      }
      // 2. Restore stock if status changes FROM Confirmed to Cancelled/Pending/etc. and stock was deducted
      else if (status !== "Confirmed" && order.stockDeducted) {
        updatedColors = current.colors.map((color) => {
          const orderedItem = order.items.find((item) => item.colorId === color.id);
          if (orderedItem) {
            return {
              ...color,
              stockQuantity: color.stockQuantity + orderedItem.quantity
            };
          }
          return color;
        });
        stockDeducted = false;
      }

      const updatedOrder = { ...order, status, stockDeducted };
      const updatedOrders = current.orders.map((o) => (o.id === orderId ? updatedOrder : o));

      return {
        ...current,
        orders: updatedOrders,
        colors: updatedColors
      };
    });
  }

  function resetDemoData() {
    setData(initialStoreData);
    setSettingsDraft(initialStoreData.settings);
    setColorDraft(blankColor(initialStoreData.products[0]?.id ?? ""));
  }

  return (
    <main className="admin-layout" dir="rtl">
      <aside className="sidebar">
        <Link className="brand" href="/">
          <Image className="brand-logo" src="/flora-logo.png" alt="Flora Style logo" width={48} height={48} priority />
          <span className="brand-name">
            <strong>Flora Style</strong>
            <span>Admin</span>
          </span>
        </Link>
        <nav className="side-nav" aria-label="Admin sections">
          {tabs.map((tab) => (
            <button className={activeTab === tab.id ? "is-active" : ""} key={tab.id} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </nav>
        <Link className="ghost-button" href="/">
          عرض المتجر
        </Link>
      </aside>

      <section className="admin-main">
        <header className="admin-header">
          <div>
            <p className="eyebrow">Flora Style Control Center</p>
            <h1>{tabs.find((tab) => tab.id === activeTab)?.label}</h1>
          </div>
          <button className="danger-button" onClick={resetDemoData}>
            إعادة بيانات التجربة
          </button>
        </header>

        {activeTab === "overview" ? (
          <>
            <div className="stats-grid">
              <Stat label="إجمالي المنتجات" value={data.products.length.toString()} />
              <Stat label="إجمالي الطلبات" value={data.orders.length.toString()} />
              <Stat label="إجمالي المبيعات" value={formatPrice(stats.totalSales)} />
              <Stat label="ألوان منخفضة المخزون" value={(stats.lowStock.length + stats.outOfStock.length).toString()} />
            </div>
            <div className="admin-grid">
              <div className="admin-panel">
                <PanelTitle title="آخر الطلبات" hint="اضغط على الطلب لعرض كامل التفاصيل والعنوان." />
                <OrdersTable data={data} onDelete={(id) => deleteById("orders", id)} onStatusChange={updateOrderStatus} />
              </div>
              <div className="admin-panel">
                <PanelTitle title="تنبيهات المخزون" hint="الألوان التي تحتاج متابعة." />
                <div className="grid" style={{ gap: "10px", marginTop: "14px" }}>
                  {[...stats.lowStock, ...stats.outOfStock].map((color) => {
                    const product = data.products.find((entry) => entry.id === color.productId);
                    return (
                      <div className="metric" key={color.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px" }}>
                        <div>
                          <strong style={{ fontSize: "16px", margin: 0 }}>{product?.nameAr ?? "منتج"}</strong>
                          <span style={{ fontSize: "12px" }}>{color.nameAr}</span>
                        </div>
                        <span style={{
                          color: color.stockQuantity === 0 ? "#ff4757" : "#ffa502",
                          fontWeight: 700,
                          fontSize: "14px",
                          border: "1px solid var(--line)",
                          padding: "2px 8px",
                          borderRadius: "8px"
                        }}>
                          {color.stockQuantity === 0 ? "نفذ" : `${color.stockQuantity} قطع`}
                        </span>
                      </div>
                    );
                  })}
                  {!stats.lowStock.length && !stats.outOfStock.length ? <div className="empty">المخزون جيد حالياً</div> : null}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {activeTab === "products" ? (
          <CrudLayout
            title="إدارة المنتجات"
            form={
              <form className="form-grid" onSubmit={saveProduct}>
                <div className="two-col form-grid">
                  {textInput<Product>("اسم المنتج عربي", productDraft.nameAr, "nameAr", setProductDraft)}
                  {textInput<Product>("اسم المنتج عبري", productDraft.nameHe, "nameHe", setProductDraft)}
                  {textInput<Product>("SKU", productDraft.sku, "sku", setProductDraft)}
                  {textInput<Product>("السعر", productDraft.price, "price", setProductDraft, "number")}
                  {textInput<Product>("سعر التخفيض (اختياري)", productDraft.salePrice ?? "", "salePrice", setProductDraft, "number")}
                  <label className="form-row">
                    <span>التصنيف</span>
                    <select className="select" value={productDraft.categoryId} onChange={(event) => setProductDraft({ ...productDraft, categoryId: event.target.value })}>
                      {data.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.nameAr}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-row">
                    <span>البراند</span>
                    <select className="select" value={productDraft.brandId} onChange={(event) => setProductDraft({ ...productDraft, brandId: event.target.value })}>
                      {data.brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.nameAr}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <Textarea label="الوصف القصير عربي" value={productDraft.descriptionAr} onChange={(value) => setProductDraft({ ...productDraft, descriptionAr: value })} />
                <Textarea label="الوصف القصير عبري" value={productDraft.descriptionHe} onChange={(value) => setProductDraft({ ...productDraft, descriptionHe: value })} />
                <Textarea label="قصة المنتج الكاملة عربي (تفاصيل الصفحة)" value={productDraft.storyAr} onChange={(value) => setProductDraft({ ...productDraft, storyAr: value })} />
                <Textarea label="قصة المنتج الكاملة عبري (تفاصيل الصفحة)" value={productDraft.storyHe} onChange={(value) => setProductDraft({ ...productDraft, storyHe: value })} />
                <Textarea
                  label="روابط صور المعرض، كل رابط في سطر منفصل"
                  value={productDraft.images.join("\n")}
                  onChange={(value) => setProductDraft({ ...productDraft, images: value.split("\n").filter(Boolean) })}
                />
                <ToggleRow
                  values={[
                    ["الأكثر مبيعاً", productDraft.bestSeller, (checked) => setProductDraft({ ...productDraft, bestSeller: checked })],
                    ["مميز", productDraft.featured, (checked) => setProductDraft({ ...productDraft, featured: checked })],
                    ["فعال", productDraft.active, (checked) => setProductDraft({ ...productDraft, active: checked })]
                  ]}
                />
                <button className="button">حفظ المنتج</button>
              </form>
            }
          >
            <ProductsTable data={data} onEdit={setProductDraft} onDelete={(id) => deleteById("products", id)} />
          </CrudLayout>
        ) : null}

        {activeTab === "inventory" ? (
          <CrudLayout
            title="إدارة الألوان والمخزون"
            form={
              <form className="form-grid" onSubmit={saveColor}>
                <label className="form-row">
                  <span>المنتج</span>
                  <select className="select" value={colorDraft.productId} onChange={(event) => setColorDraft({ ...colorDraft, productId: event.target.value })}>
                    {data.products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.nameAr}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="two-col form-grid">
                  {textInput<ProductColor>("اللون عربي", colorDraft.nameAr, "nameAr", setColorDraft)}
                  {textInput<ProductColor>("اللون عبري", colorDraft.nameHe, "nameHe", setColorDraft)}
                  {textInput<ProductColor>("قيمة اللون HEX", colorDraft.value, "value", setColorDraft)}
                  {textInput<ProductColor>("الكمية بالمخزن", colorDraft.stockQuantity, "stockQuantity", setColorDraft, "number")}
                </div>
                <button className="button">حفظ اللون</button>
              </form>
            }
          >
            <InventoryTable data={data} onEdit={setColorDraft} onDelete={(id) => deleteById("colors", id)} />
          </CrudLayout>
        ) : null}

        {activeTab === "orders" ? (
          <div className="admin-panel">
            <PanelTitle title="إدارة الطلبات المستلمة" hint="اضغط على صف الطلب لعرض كامل تفاصيله، عنوانه والمنتجات المطلوبة بداخل السلة." />
            <OrdersTable data={data} onDelete={(id) => deleteById("orders", id)} onStatusChange={updateOrderStatus} />
          </div>
        ) : null}

        {activeTab === "categories" ? (
          <SimpleEntitySection
            title="إدارة التصنيفات"
            draft={categoryDraft}
            setDraft={setCategoryDraft}
            onSubmit={saveCategory}
            rows={data.categories}
            onEdit={setCategoryDraft}
            onDelete={(id) => deleteById("categories", id)}
            imageLabel="رابط صورة التصنيف"
          />
        ) : null}

        {activeTab === "brands" ? (
          <SimpleEntitySection
            title="إدارة البراندات"
            draft={brandDraft}
            setDraft={setBrandDraft}
            onSubmit={saveBrand}
            rows={data.brands}
            onEdit={setBrandDraft}
            onDelete={(id) => deleteById("brands", id)}
            imageLabel="رابط شعار البراند"
          />
        ) : null}

        {activeTab === "delivery" ? (
          <CrudLayout
            title="مناطق ورسوم التوصيل"
            form={
              <form className="form-grid" onSubmit={saveZone}>
                <div className="two-col form-grid">
                  {textInput<DeliveryZone>("الاسم عربي", zoneDraft.nameAr, "nameAr", setZoneDraft)}
                  {textInput<DeliveryZone>("الاسم عبري", zoneDraft.nameHe, "nameHe", setZoneDraft)}
                  {textInput<DeliveryZone>("رسوم التوصيل (NIS)", zoneDraft.deliveryFee, "deliveryFee", setZoneDraft, "number")}
                </div>
                <ToggleRow values={[["فعال", zoneDraft.active, (checked) => setZoneDraft({ ...zoneDraft, active: checked })]]} />
                <button className="button">حفظ المنطقة</button>
              </form>
            }
          >
            <EntityTable rows={data.deliveryZones} columns={["nameAr", "nameHe", "deliveryFee", "active"]} onEdit={setZoneDraft} onDelete={(id) => deleteById("deliveryZones", id)} />
          </CrudLayout>
        ) : null}

        {activeTab === "banners" ? (
          <CrudLayout
            title="إدارة البانرات"
            form={
              <form className="form-grid" onSubmit={saveBanner}>
                <div className="two-col form-grid">
                  {textInput<Banner>("العنوان عربي", bannerDraft.titleAr, "titleAr", setBannerDraft)}
                  {textInput<Banner>("العنوان عبري", bannerDraft.titleHe, "titleHe", setBannerDraft)}
                  {textInput<Banner>("رابط الصورة", bannerDraft.imageUrl, "imageUrl", setBannerDraft)}
                </div>
                <Textarea label="وصف البانر عربي" value={bannerDraft.subtitleAr} onChange={(value) => setBannerDraft({ ...bannerDraft, subtitleAr: value })} />
                <Textarea label="وصف البانر عبري" value={bannerDraft.subtitleHe} onChange={(value) => setBannerDraft({ ...bannerDraft, subtitleHe: value })} />
                <ToggleRow values={[["فعال", bannerDraft.active, (checked) => setBannerDraft({ ...bannerDraft, active: checked })]]} />
                <button className="button">حفظ البانر</button>
              </form>
            }
          >
            <EntityTable rows={data.banners} columns={["titleAr", "titleHe", "active"]} onEdit={setBannerDraft} onDelete={(id) => deleteById("banners", id)} />
          </CrudLayout>
        ) : null}

        {activeTab === "settings" ? (
          <div className="admin-panel">
            <PanelTitle title="إعدادات المتجر العامة" hint="رقم واتساب هنا هو المصدر الوحيد لرسائل الطلب المستلمة." />
            <form className="form-grid" onSubmit={saveSettings} style={{ marginTop: "20px" }}>
              <div className="two-col form-grid">
                {textInput<StoreSettings>("اسم المتجر", settingsDraft.storeName, "storeName", setSettingsDraft)}
                {textInput<StoreSettings>("رقم واتساب (شامل كود الدولة وبدون أصفار أو +)", settingsDraft.whatsappNumber, "whatsappNumber", setSettingsDraft)}
                {textInput<StoreSettings>("Instagram URL", settingsDraft.instagramUrl, "instagramUrl", setSettingsDraft)}
                {textInput<StoreSettings>("Facebook URL", settingsDraft.facebookUrl, "facebookUrl", setSettingsDraft)}
                {textInput<StoreSettings>("TikTok URL", settingsDraft.tiktokUrl, "tiktokUrl", setSettingsDraft)}
                {textInput<StoreSettings>("البريد الإلكتروني", settingsDraft.email, "email", setSettingsDraft)}
              </div>
              <Textarea label="العنوان الجغرافي عربي" value={settingsDraft.addressAr} onChange={(value) => setSettingsDraft({ ...settingsDraft, addressAr: value })} />
              <Textarea label="العنوان الجغرافي عبري" value={settingsDraft.addressHe} onChange={(value) => setSettingsDraft({ ...settingsDraft, addressHe: value })} />
              <button className="button">حفظ الإعدادات</button>
            </form>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function upsert<K extends keyof StoreData, T extends { id: string }>(current: StoreData, key: K, draft: T, blank: () => T): StoreData {
  const collection = current[key] as unknown as T[];
  const exists = collection.some((item) => item.id === draft.id);
  const saved = draft.id ? draft : { ...draft, id: uid(String(key)) };
  return {
    ...current,
    [key]: exists ? collection.map((item) => (item.id === draft.id ? draft : item)) : [saved, ...collection]
  };
}

function blankProduct(categoryId = "", brandId = ""): Product {
  return {
    id: "",
    slug: "",
    sku: "",
    categoryId,
    brandId,
    nameAr: "",
    nameHe: "",
    descriptionAr: "",
    descriptionHe: "",
    storyAr: "",
    storyHe: "",
    price: 0,
    salePrice: undefined,
    images: ["https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=88"],
    bestSeller: false,
    featured: false,
    active: true,
    createdAt: new Date().toISOString().slice(0, 10)
  };
}

function blankCategory(): Category {
  return { id: "", slug: "", nameAr: "", nameHe: "", descriptionAr: "", descriptionHe: "", imageUrl: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=800&q=88", active: true };
}

function blankBrand(): Brand {
  return { id: "", slug: "", nameAr: "", nameHe: "", descriptionAr: "", descriptionHe: "", logoUrl: "/flora-logo.png", active: true };
}

function blankColor(productId: string): ProductColor {
  return { id: "", productId, nameAr: "", nameHe: "", value: "#d4af37", stockQuantity: 0 };
}

function blankZone(): DeliveryZone {
  return { id: "", nameAr: "", nameHe: "", deliveryFee: 0, active: true };
}

function blankBanner(): Banner {
  return { id: "", titleAr: "", titleHe: "", subtitleAr: "", subtitleHe: "", imageUrl: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=88", active: true };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

// Stats panel section title component
function PanelTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="section-head" style={{ borderBottom: "1px solid var(--line)", paddingBottom: "12px", marginBottom: "16px" }}>
      <h2>{title}</h2>
      <p style={{ color: "var(--muted)", margin: "4px 0 0", fontSize: "13px" }}>{hint}</p>
    </div>
  );
}

function CrudLayout({ title, form, children }: { title: string; form: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="admin-grid">
      <div className="admin-panel">
        <PanelTitle title={title} hint="القائمة الحالية قابلة للتعديل والحذف." />
        {children}
      </div>
      <div className="admin-panel">
        <PanelTitle title="نموذج التحكم" hint="املأ البيانات ثم احفظ." />
        {form}
      </div>
    </div>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="form-row">
      <span>{label}</span>
      <textarea className="textarea" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ToggleRow({ values }: { values: Array<[string, boolean, (checked: boolean) => void]> }) {
  return (
    <div className="filters">
      {values.map(([label, checked, onChange]) => (
        <label className="check-row" key={label}>
          <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}

function ProductsTable({ data, onEdit, onDelete }: { data: StoreData; onEdit: (product: Product) => void; onDelete: (id: string) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>المنتج</th>
            <th>SKU</th>
            <th>السعر</th>
            <th>الحالة</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {data.products.map((product) => {
            return (
              <tr key={product.id}>
                <td>
                  <strong>{product.nameAr}</strong>
                  <br />
                  <span className="muted">{product.nameHe}</span>
                </td>
                <td>{product.sku}</td>
                <td>{formatPrice(product.salePrice || product.price)}</td>
                <td>
                  <span style={{
                    color: product.active ? "#2ed573" : "#ff4757",
                    fontWeight: 700
                  }}>
                    {product.active ? "نشط" : "معطل"}
                  </span>
                </td>
                <td>
                  <button className="ghost-button" style={{ marginInlineEnd: "8px" }} onClick={() => onEdit(product)}>
                    تعديل
                  </button>
                  <button className="danger-button" onClick={() => onDelete(product.id)}>
                    حذف
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function InventoryTable({ data, onEdit, onDelete }: { data: StoreData; onEdit: (color: ProductColor) => void; onDelete: (id: string) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>المنتج</th>
            <th>اللون</th>
            <th>المخزون</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {data.colors.map((color) => {
            const product = data.products.find((entry) => entry.id === color.productId);
            return (
              <tr key={color.id}>
                <td>{product?.nameAr ?? "-"}</td>
                <td>
                  <span className="swatch" style={{ background: color.value }} /> {color.nameAr}
                  <br />
                  <small className="muted">{color.nameHe} / {color.value}</small>
                </td>
                <td>
                  <strong style={{ color: color.stockQuantity <= 3 ? "#ffa502" : "inherit" }}>
                    {color.stockQuantity}
                  </strong>
                </td>
                <td>
                  <button className="ghost-button" style={{ marginInlineEnd: "8px" }} onClick={() => onEdit(color)}>
                    تعديل
                  </button>
                  <button className="danger-button" onClick={() => onDelete(color.id)}>
                    حذف
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Collapsible Orders Table for detailed order management
function OrdersTable({
  data,
  onStatusChange,
  onDelete
}: {
  data: StoreData;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "Pending": return "#ffa502";
      case "Confirmed": return "#2ed573";
      case "Processing": return "#9b59b6";
      case "Delivered": return "#10ac84";
      case "Cancelled": return "#ff4757";
      default: return "#fff";
    }
  };

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>رقم الطلب</th>
            <th>الزبون</th>
            <th>الإجمالي</th>
            <th>الحالة</th>
            <th>المنتجات</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {data.orders.map((order) => {
            const zone = data.deliveryZones.find((z) => z.id === order.deliveryZoneId);
            const isExpanded = expandedOrderId === order.id;
            return (
              <React.Fragment key={order.id}>
                <tr
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                  style={{ cursor: "pointer", borderBottom: isExpanded ? "none" : "1px solid var(--line)" }}
                >
                  <td>
                    <strong>#{order.orderNumber}</strong>
                    <br />
                    <small className="muted">{order.createdAt}</small>
                  </td>
                  <td>
                    <strong>{order.customerName}</strong>
                    <br />
                    <span className="muted">{order.phoneNumber}</span>
                  </td>
                  <td style={{ color: "var(--gold)", fontWeight: 700 }}>{formatPrice(order.totalPrice)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      className="select"
                      value={order.status}
                      onChange={(event) => onStatusChange(order.id, event.target.value as OrderStatus)}
                      style={{
                        borderColor: getStatusColor(order.status),
                        color: getStatusColor(order.status),
                        background: "rgba(11,11,10,0.8)",
                        fontWeight: 700
                      }}
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status} style={{ color: getStatusColor(status) }}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)} قطع</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button className="danger-button" onClick={() => onDelete(order.id)}>
                      حذف
                    </button>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="order-details-expanded">
                    <td colSpan={6} style={{ background: "rgba(212,175,55,0.02)", padding: "24px", borderBottom: "1px solid var(--line)" }}>
                      <div style={{ display: "grid", gap: "24px", gridTemplateColumns: "1fr 1fr" }}>
                        <div>
                          <h4 style={{ color: "var(--gold)", margin: "0 0 12px", fontSize: "16px", borderBottom: "1px solid var(--line)", paddingBottom: "6px" }}>
                            تفاصيل العميل والتوصيل
                          </h4>
                          <div style={{ display: "grid", gap: "8px", fontSize: "14px" }}>
                            <p><strong>الاسم بالكامل:</strong> {order.customerName}</p>
                            <p><strong>رقم الهاتف:</strong> {order.phoneNumber}</p>
                            <p><strong>منطقة التوصيل:</strong> {zone ? zone.nameAr : "-"}</p>
                            <p><strong>العنوان المفصل:</strong> {order.detailedAddress}</p>
                            <p><strong>ملاحظات العميل:</strong> {order.notes || "-"}</p>
                            <p><strong>حالة الخصم من المخزون:</strong> <span style={{ color: order.stockDeducted ? "#2ed573" : "#ffa502", fontWeight: 700 }}>{order.stockDeducted ? "تم الخصم تلقائياً" : "لم يخصم بعد"}</span></p>
                          </div>
                        </div>
                        <div>
                          <h4 style={{ color: "var(--gold)", margin: "0 0 12px", fontSize: "16px", borderBottom: "1px solid var(--line)", paddingBottom: "6px" }}>
                            المنتجات المطلوبة
                          </h4>
                          <div style={{ display: "grid", gap: "10px", maxHeight: "150px", overflowY: "auto" }}>
                            {order.items.map((item, idx) => {
                              const prod = data.products.find((p) => p.id === item.productId);
                              const col = data.colors.find((c) => c.id === item.colorId);
                              return (
                                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", borderBottom: "1px dashed rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                                  <div>
                                    <strong>{prod ? prod.nameAr : "منتج غير موجود"}</strong>
                                    <span style={{ fontSize: "12px", color: "var(--muted)", marginInlineStart: "8px" }}>
                                      (اللون: {col ? col.nameAr : "-"})
                                    </span>
                                  </div>
                                  <span style={{ fontWeight: 600 }}>
                                    {item.quantity} × {formatPrice(item.price)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ borderTop: "1px solid var(--line)", marginTop: "16px", paddingTop: "12px", fontSize: "14px", display: "grid", gap: "6px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>مجموع المنتجات:</span>
                              <strong>{formatPrice(order.subtotal)}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>تكلفة التوصيل:</span>
                              <strong>{formatPrice(order.deliveryFee)}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", color: "var(--gold)", borderTop: "1px dashed var(--line)", paddingTop: "8px" }}>
                              <span>الإجمالي الكلي:</span>
                              <strong>{formatPrice(order.totalPrice)}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
          {data.orders.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty">لا توجد طلبات مستلمة حتى الآن.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function SimpleEntitySection<T extends Category | Brand>({
  title,
  draft,
  setDraft,
  onSubmit,
  rows,
  onEdit,
  onDelete,
  imageLabel
}: {
  title: string;
  draft: T;
  setDraft: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  rows: T[];
  onEdit: React.Dispatch<React.SetStateAction<any>>;
  onDelete: (id: string) => void;
  imageLabel: string;
}) {
  const imageValue = "imageUrl" in draft ? draft.imageUrl : draft.logoUrl;
  const setImageValue = (value: string) => {
    setDraft((current: any) => ("imageUrl" in current ? { ...current, imageUrl: value } : { ...current, logoUrl: value }));
  };
  return (
    <CrudLayout
      title={title}
      form={
        <form className="form-grid" onSubmit={onSubmit}>
          <div className="two-col form-grid">
            {textInput<T>("الاسم عربي", draft.nameAr, "nameAr", setDraft)}
            {textInput<T>("الاسم عبري", draft.nameHe, "nameHe", setDraft)}
            <label className="form-row">
              <span>{imageLabel}</span>
              <input className="field" value={imageValue} onChange={(event) => setImageValue(event.target.value)} />
            </label>
          </div>
          <Textarea label="الوصف عربي" value={draft.descriptionAr} onChange={(value) => setDraft((current: any) => ({ ...current, descriptionAr: value }))} />
          <Textarea label="الوصف عبري" value={draft.descriptionHe} onChange={(value) => setDraft((current: any) => ({ ...current, descriptionHe: value }))} />
          <ToggleRow values={[["فعال", draft.active, (checked) => setDraft((current: any) => ({ ...current, active: checked }))]]} />
          <button className="button">حفظ</button>
        </form>
      }
    >
      <EntityTable rows={rows} columns={["nameAr", "nameHe", "active"]} onEdit={onEdit} onDelete={onDelete} />
    </CrudLayout>
  );
}

function EntityTable<T extends { id: string } & Record<string, unknown>>({
  rows,
  columns,
  onEdit,
  onDelete
}: {
  rows: T[];
  columns: Array<keyof T>;
  onEdit: (row: T) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column)}>{String(column)}</th>
            ))}
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={String(column)}>{formatCell(row[column])}</td>
              ))}
              <td>
                <button className="ghost-button" style={{ marginInlineEnd: "8px" }} onClick={() => onEdit(row)}>
                  تعديل
                </button>
                <button className="danger-button" onClick={() => onDelete(row.id)}>
                  حذف
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="empty">لا توجد سجلات مضافة.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(value: unknown) {
  if (typeof value === "boolean") return value ? "فعال" : "متوقف";
  if (typeof value === "number") return value.toString();
  return String(value ?? "-");
}

import React from "react";
