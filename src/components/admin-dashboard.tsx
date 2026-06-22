"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Banner,
  Brand,
  Category,
  DeliveryZone,
  formatPrice,
  initialStoreData,
  Order,
  OrderStatus,
  Product,
  ProductColor,
  StoreData,
  StoreSettings
} from "@/lib/store";
import { loadStoreData, saveStoreData, subscribeToStoreData } from "@/lib/db";
import {
  deleteBrand,
  deleteEntity,
  saveSettings as saveSettingsRemote,
  syncStructureCatalog,
  uploadAdminAsset,
  uploadAdminAssets,
  upsertBanner,
  upsertBrand,
  upsertCategory,
  upsertColor,
  upsertDeliveryZone,
  upsertProduct,
} from "@/lib/supabase/admin";
import { fetchStoreDataWithOrders } from "@/lib/supabase/catalog";
import { fetchOrders, updateOrderStatus as updateOrderStatusSupabase, subscribeToOrders } from "@/lib/supabase/orders";
import { createBrowserSupabaseClient, getSupabaseConfigStatus } from "@/lib/supabase/client";
import { adminDeleteMessage, adminSaveMessage, formatAdminError } from "@/lib/admin-messages";
import { buildProductSlug } from "@/lib/slug";

type AdminTab = "overview" | "products" | "inventory" | "orders" | "categories" | "brands" | "delivery" | "banners" | "settings" | "accounts" | "profile";

type AdminAccount = {
  user_id: string;
  email: string;
  display_name: string | null;
  created_at: string;
};

type AdminAccountDraft = {
  email: string;
  password: string;
  displayName: string;
};

type AdminProfileDraft = {
  email: string;
  newPassword: string;
  confirmPassword: string;
};

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "overview", label: "نظرة عامة" },
  { id: "products", label: "المنتجات" },
  { id: "inventory", label: "المخزون والألوان" },
  { id: "orders", label: "الطلبات" },
  { id: "categories", label: "التصنيفات" },
  { id: "brands", label: "البراندات" },
  { id: "delivery", label: "التوصيل" },
  { id: "banners", label: "البانرات" },
  { id: "settings", label: "الإعدادات" },
  { id: "accounts", label: "حسابات الأدمن" },
  { id: "profile", label: "ملفي الشخصي" }
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
  type = "text",
  placeholder?: string
) {
  return (
    <label className="form-row">
      <span>{label}</span>
      <input
        className="field"
        placeholder={placeholder}
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

function AdminProductThumb({ imageUrl, label }: { imageUrl?: string; label: string }) {
  if (!imageUrl) {
    return <span aria-hidden className="admin-product-thumb admin-product-thumb--empty" />;
  }

  return (
    <Image
      alt={label}
      className="admin-product-thumb"
      height={48}
      src={imageUrl}
      unoptimized
      width={48}
    />
  );
}

function AdminProductPreview({ product }: { product: Product }) {
  return (
    <div className="admin-product-preview">
      <AdminProductThumb imageUrl={product.images[0]} label={product.nameAr} />
      <div>
        <strong>{product.nameAr}</strong>
        <p className="muted">{product.sku}</p>
      </div>
    </div>
  );
}

function AdminPicker({
  emptyLabel = "اختر من القائمة",
  label,
  onChange,
  options,
  searchable = false,
  searchPlaceholder = "ابحثي...",
  value,
}: {
  emptyLabel?: string;
  label: string;
  onChange: (id: string) => void;
  options: Array<{ id: string; label: string; imageUrl?: string }>;
  searchable?: boolean;
  searchPlaceholder?: string;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const controlRef = React.useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.id === value);

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!controlRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <label className="form-row admin-picker">
      <span>{label}</span>
      <div className={`admin-picker__control${open ? " is-open" : ""}`} ref={controlRef}>
        <button
          aria-expanded={open}
          className="admin-picker__trigger"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          {selected?.imageUrl ? <AdminProductThumb imageUrl={selected.imageUrl} label={selected.label} /> : null}
          <span>{selected?.label ?? emptyLabel}</span>
        </button>
        {open ? (
          <div className="admin-picker__menu">
            {searchable ? (
              <input
                className="field admin-picker__search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                type="search"
                value={query}
              />
            ) : null}
            <ul className="admin-picker__list" role="listbox">
              {filteredOptions.map((option) => (
                <li key={option.id}>
                  <button
                    className={option.id === value ? "is-active" : ""}
                    onClick={() => {
                      onChange(option.id);
                      setOpen(false);
                      setQuery("");
                    }}
                    role="option"
                    type="button"
                  >
                    {option.imageUrl ? <AdminProductThumb imageUrl={option.imageUrl} label={option.label} /> : null}
                    <span>{option.label}</span>
                  </button>
                </li>
              ))}
              {!filteredOptions.length ? <li className="admin-picker__empty">لا توجد نتائج مطابقة</li> : null}
            </ul>
          </div>
        ) : null}
      </div>
    </label>
  );
}

export function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [data, setData] = useState<StoreData>(initialStoreData);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const [productDraft, setProductDraft] = useState<Product>(() => blankProduct(data.categories[0]?.id, data.brands[0]?.id));
  const [productDefaultStock, setProductDefaultStock] = useState(1);
  const [productColorDrafts, setProductColorDrafts] = useState<ProductColorFormRow[]>(() => [blankProductColorRow()]);
  const [categoryDraft, setCategoryDraft] = useState<Category>(() => blankCategory());
  const [brandDraft, setBrandDraft] = useState<Brand>(() => blankBrand());
  const [colorDraft, setColorDraft] = useState<ProductColor>(() => blankColor(data.products[0]?.id ?? ""));
  const [zoneDraft, setZoneDraft] = useState<DeliveryZone>(() => blankZone());
  const [bannerDraft, setBannerDraft] = useState<Banner>(() => blankBanner());
  const [settingsDraft, setSettingsDraft] = useState<StoreSettings>(data.settings);
  const [uploadingField, setUploadingField] = useState("");
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [serviceRoleConfigured, setServiceRoleConfigured] = useState(false);
  const [accountDraft, setAccountDraft] = useState<AdminAccountDraft>({
    email: "",
    password: "",
    displayName: "",
  });
  const [profileDraft, setProfileDraft] = useState<AdminProfileDraft>({
    email: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Supabase-backed orders (for the Orders tab)
  const [supabaseOrders, setSupabaseOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [supabaseAvailable, setSupabaseAvailable] = useState(false);

  async function refreshData() {
    const fresh = await fetchStoreDataWithOrders();
    setData(fresh);
    setSettingsDraft(fresh.settings);
    setSupabaseOrders(fresh.orders);
    saveStoreData(fresh, { notify: true });
    return fresh;
  }

  async function loadAdminAccounts() {
    setAccountsLoading(true);
    setSyncError("");
    try {
      const response = await fetch("/api/admin/accounts", { credentials: "include" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "تعذر تحميل حسابات الأدمن.");
      }
      setAdminAccounts(payload.accounts ?? []);
      setServiceRoleConfigured(!!payload.serviceRoleConfigured);
    } catch (error) {
      setSyncError(formatAdminError(error, "تعذر تحميل حسابات الأدمن."));
    } finally {
      setAccountsLoading(false);
    }
  }

  // Sync state with remote store data (fallbacks still come from local cache)
  useEffect(() => {
    setData(loadStoreData());
    const unsub = subscribeToStoreData(
      (fresh) => {
        setData(fresh);
        setSettingsDraft(fresh.settings);
      },
      { skipInitialRefresh: true }
    );
    void refreshData();
    return () => unsub();
  }, []);

  // Check if Supabase is configured
  useEffect(() => {
    const status = getSupabaseConfigStatus();
    setSupabaseAvailable(status.hasUrl && status.hasKey);
  }, []);

  // Load orders from Supabase when the Orders tab is opened
  useEffect(() => {
    let unsub: (() => void) | null = null;

    async function loadRemoteOrders() {
      if (activeTab !== "orders") return;
      setOrdersLoading(true);
      const remote = await fetchOrders();
      setSupabaseOrders(remote);
      setOrdersLoading(false);
    }

    if (activeTab === "orders") {
      loadRemoteOrders();

      // Realtime updates (live new orders / status changes)
      unsub = subscribeToOrders((freshOrders) => {
        setSupabaseOrders(freshOrders);
      });
    }

    return () => {
      if (unsub) unsub();
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "accounts") {
      void loadAdminAccounts();
    }
  }, [activeTab]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [activeTab]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      return;
    }

    let mounted = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!mounted) {
        return;
      }

      setProfileDraft((current) => ({
        ...current,
        email: data.user?.email || "",
      }));
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setProductDraft((current) => {
      if (current.id) {
        return current;
      }

      const nextCategoryId = current.categoryId || data.categories[0]?.id || "";
      const nextBrandId = current.brandId || data.brands[0]?.id || "";

      if (nextCategoryId === current.categoryId && nextBrandId === current.brandId) {
        return current;
      }

      return {
        ...current,
        categoryId: nextCategoryId,
        brandId: nextBrandId,
      };
    });

    setColorDraft((current) => {
      if (current.id || current.productId || !data.products[0]?.id) {
        return current;
      }

      return {
        ...current,
        productId: data.products[0].id,
      };
    });
  }, [data.brands, data.categories, data.products]);

  const stats = useMemo(() => {
    const totalSales = data.orders
      .filter((order) => order.status !== "Cancelled")
      .reduce((sum, order) => sum + order.totalPrice, 0);
    const lowStock = data.colors.filter((color) => color.stockQuantity > 0 && color.stockQuantity <= 3);
    const outOfStock = data.colors.filter((color) => color.stockQuantity === 0);
    return { totalSales, lowStock, outOfStock };
  }, [data]);

  const activeTabMeta = tabs.find((tab) => tab.id === activeTab);

  function beginEditProduct(product: Product) {
    const rows = data.colors.filter((color) => color.productId === product.id);
    setProductDraft(product);
    setProductColorDrafts(rows.length ? rows.map(mapColorToFormRow) : [blankProductColorRow()]);
    setProductDefaultStock(rows[0]?.stockQuantity ?? 1);
  }

  function resetProductForm() {
    setProductDraft(blankProduct(data.categories[0]?.id, data.brands[0]?.id));
    setProductColorDrafts([blankProductColorRow()]);
    setProductDefaultStock(1);
  }

  function updateProductColorRow(index: number, patch: Partial<ProductColorFormRow>) {
    setProductColorDrafts((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function addProductColorRow() {
    setProductColorDrafts((current) => [...current, blankProductColorRow()]);
  }

  function removeProductColorRow(index: number) {
    setProductColorDrafts((current) => (current.length <= 1 ? [blankProductColorRow()] : current.filter((_, rowIndex) => rowIndex !== index)));
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSyncError("");
    if (!productDraft.nameAr.trim()) {
      setSyncError("أدخلي اسم المنتج بالعربية.");
      return;
    }
    if (!productDraft.sku.trim()) {
      setSyncError("أدخلي رمز المنتج (كود المخزون).");
      return;
    }
    if (!productDraft.categoryId) {
      setSyncError("اختاري تصنيفاً للمنتج.");
      return;
    }
    if (productDraft.price <= 0) {
      setSyncError("أدخلي سعراً صحيحاً للمنتج.");
      return;
    }
    if (!productDraft.images.length) {
      setSyncError("ارفع صورة واحدة على الأقل للمنتج قبل الحفظ.");
      return;
    }
    if (productDefaultStock < 0) {
      setSyncError("الكمية الافتراضية يجب أن تكون صفراً أو أكثر.");
      return;
    }

    const validColors = productColorDrafts.filter((row) => row.nameAr.trim() || row.nameHe.trim());
    if (validColors.length === 0 && productDefaultStock <= 0) {
      setSyncError("أضيفي لوناً واحداً على الأقل مع الكمية، أو حددي مخزوناً افتراضياً.");
      return;
    }

    const baseProduct = productDraft.id
      ? productDraft
      : { ...productDraft, id: uid("prod"), createdAt: new Date().toISOString().slice(0, 10) };
    const nextProduct = {
      ...baseProduct,
      slug: buildProductSlug(baseProduct),
      sku: productDraft.sku.trim(),
      nameAr: productDraft.nameAr.trim(),
    };
    const hasColors = validColors.length > 0;

    await upsertProduct(nextProduct, hasColors ? undefined : productDefaultStock);

    const existingColorIds = data.colors.filter((color) => color.productId === nextProduct.id).map((color) => color.id);
    const savedColorIds: string[] = [];

    for (const row of validColors) {
      const colorId = row.id || uid("color");
      await upsertColor({
        id: colorId,
        productId: nextProduct.id,
        nameAr: row.nameAr.trim() || row.nameHe.trim(),
        nameHe: row.nameHe.trim() || row.nameAr.trim(),
        value: row.value || "#d4af37",
        stockQuantity: Math.max(0, Number(row.stockQuantity) || 0),
      });
      savedColorIds.push(colorId);
    }

    for (const colorId of existingColorIds) {
      if (!savedColorIds.includes(colorId)) {
        await deleteEntity("product_colors", colorId);
      }
    }

    await refreshData();
    resetProductForm();
    setSyncMessage(adminSaveMessage("products"));
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSyncError("");
    if (!categoryDraft.imageUrl) {
      setSyncError("ارفع صورة للتصنيف قبل الحفظ.");
      return;
    }
    const nextCategory = categoryDraft.id ? categoryDraft : { ...categoryDraft, id: uid("cat") };
    await upsertCategory(nextCategory);
    await refreshData();
    setCategoryDraft(blankCategory());
    setSyncMessage(adminSaveMessage("categories"));
  }

  async function saveBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSyncError("");
    if (!brandDraft.logoUrl) {
      setSyncError("ارفع شعار البراند قبل الحفظ.");
      return;
    }
    const nextBrand = brandDraft.id ? brandDraft : { ...brandDraft, id: uid("brand") };
    await upsertBrand(nextBrand);
    await refreshData();
    setBrandDraft(blankBrand());
    setSyncMessage(adminSaveMessage("brands"));
  }

  async function saveColor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSyncError("");
    if (!colorDraft.productId) {
      setSyncError("اختاري المنتج أولاً.");
      return;
    }
    if (!colorDraft.nameAr.trim() && !colorDraft.nameHe.trim()) {
      setSyncError("أدخلي اسم اللون بالعربية أو العبرية.");
      return;
    }
    const nextColor = colorDraft.id ? colorDraft : { ...colorDraft, id: uid("color") };
    await upsertColor({
      ...nextColor,
      nameAr: nextColor.nameAr.trim() || nextColor.nameHe.trim(),
      nameHe: nextColor.nameHe.trim() || nextColor.nameAr.trim(),
      stockQuantity: Math.max(0, Number(nextColor.stockQuantity) || 0),
    });
    await refreshData();
    setColorDraft(blankColor(data.products[0]?.id ?? ""));
    setSyncMessage(adminSaveMessage("colors"));
  }

  async function saveZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSyncError("");
    const nextZone = zoneDraft.id ? zoneDraft : { ...zoneDraft, id: uid("zone") };
    await upsertDeliveryZone(nextZone);
    await refreshData();
    setZoneDraft(blankZone());
    setSyncMessage(adminSaveMessage("deliveryZones"));
  }

  async function saveBanner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSyncError("");
    if (!bannerDraft.imageUrl) {
      setSyncError("ارفع صورة البانر قبل الحفظ.");
      return;
    }
    const nextBanner = bannerDraft.id ? bannerDraft : { ...bannerDraft, id: uid("banner") };
    await upsertBanner(nextBanner);
    await refreshData();
    setBannerDraft(blankBanner());
    setSyncMessage(adminSaveMessage("banners"));
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSyncError("");
    await saveSettingsRemote(settingsDraft);
    await refreshData();
    setSyncMessage(adminSaveMessage("settings"));
  }

  async function handleSingleAssetUpload(
    file: File | null,
    folder: string,
    applyUrl: (url: string) => void,
    fieldLabel: string
  ) {
    if (!file) return;

    setUploadingField(fieldLabel);
    setSyncError("");
    try {
      const url = await uploadAdminAsset(file, folder);
      applyUrl(url);
      setSyncMessage(`تم رفع ${fieldLabel} بنجاح.`);
    } catch (error) {
      setSyncError(formatAdminError(error, `تعذر رفع ${fieldLabel}.`));
    } finally {
      setUploadingField("");
    }
  }

  async function handleProductImagesUpload(files: FileList | null) {
    if (!files?.length) return;

    setUploadingField("صور المنتج");
    setSyncError("");
    try {
      const urls = await uploadAdminAssets(Array.from(files), "products");
      setProductDraft((current) => ({
        ...current,
        images: [...current.images, ...urls],
      }));
      setSyncMessage("تم رفع صور المنتج.");
    } catch (error) {
      setSyncError(formatAdminError(error, "تعذر رفع صور المنتج."));
    } finally {
      setUploadingField("");
    }
  }

  function removeProductImage(index: number) {
    setProductDraft((current) => ({
      ...current,
      images: current.images.filter((_, imageIndex) => imageIndex !== index),
    }));
  }

  async function createAdditionalAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountsLoading(true);
    setSyncError("");
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(accountDraft),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "تعذر إنشاء حساب الأدمن.");
      }

      setAccountDraft({ email: "", password: "", displayName: "" });
      await loadAdminAccounts();
      setSyncMessage("تم إنشاء حساب الأدمن الجديد بنجاح.");
    } catch (error) {
      setSyncError(formatAdminError(error, "تعذر إنشاء حساب الأدمن."));
    } finally {
      setAccountsLoading(false);
    }
  }

  async function updateMyPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSyncError("");

    if (!profileDraft.newPassword || profileDraft.newPassword.length < 8) {
      setSyncError("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.");
      return;
    }

    if (profileDraft.newPassword !== profileDraft.confirmPassword) {
      setSyncError("تأكيد كلمة المرور غير مطابق.");
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setSyncError("نظام قاعدة البيانات غير متصل حالياً.");
      return;
    }

    setAccountsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: profileDraft.newPassword,
      });

      if (error) {
        throw error;
      }

      setProfileDraft((current) => ({
        ...current,
        newPassword: "",
        confirmPassword: "",
      }));
      setSyncMessage("تم تغيير كلمة المرور بنجاح.");
    } catch (error) {
      setSyncError(formatAdminError(error, "تعذر تغيير كلمة المرور."));
    } finally {
      setAccountsLoading(false);
    }
  }

  async function deleteById(
    key: keyof Pick<StoreData, "products" | "categories" | "brands" | "colors" | "deliveryZones" | "banners" | "orders">,
    id: string
  ) {
    setSyncError("");

    if (key === "products") {
      const product = data.products.find((entry) => entry.id === id);
      const confirmed = window.confirm(
        `حذف المنتج "${product?.nameAr ?? id}" نهائياً؟\nهذا الإجراء لا يمكن التراجع عنه.`
      );
      if (!confirmed) return;
    }

    if (key === "orders") {
      const confirmed = window.confirm("حذف هذا الطلب نهائياً من السجل؟");
      if (!confirmed) return;
    }

    const tableMap = {
      products: "products",
      categories: "categories",
      brands: "brands",
      colors: "product_colors",
      deliveryZones: "delivery_zones",
      banners: "banners",
      orders: "orders",
    } as const;

    if (key === "brands") {
      await deleteBrand(id);
    } else {
      await deleteEntity(tableMap[key], id);
    }
    await refreshData();
    setSyncMessage(adminDeleteMessage(key));
  }

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    await handleSupabaseOrderStatusChange(orderId, status);
  }

  // Supabase version of status update (used in the dedicated Orders tab)
  async function handleSupabaseOrderStatusChange(orderId: string, status: OrderStatus) {
    // 1. Find the order in our supabase list (or fall back to local)
    const order = supabaseOrders.find((o) => o.id === orderId) || data.orders.find((o) => o.id === orderId);
    if (!order) return;

    let newStockDeducted = order.stockDeducted ?? false;

      // Apply same stock logic locally so inventory numbers update immediately
    setData((current) => {
      let updatedColors = [...current.colors];
      const targetOrder = current.orders.find((o) => o.id === orderId) || order;

      if (status === "Confirmed" && !targetOrder.stockDeducted) {
        updatedColors = current.colors.map((color) => {
          const orderedItem = targetOrder.items.find((item: any) => item.colorId === color.id);
          if (orderedItem) {
            return {
              ...color,
              stockQuantity: Math.max(0, color.stockQuantity - orderedItem.quantity),
            };
          }
          return color;
        });
        newStockDeducted = true;
      } else if (status !== "Confirmed" && targetOrder.stockDeducted) {
        updatedColors = current.colors.map((color) => {
          const orderedItem = targetOrder.items.find((item: any) => item.colorId === color.id);
          if (orderedItem) {
            return {
              ...color,
              stockQuantity: color.stockQuantity + orderedItem.quantity,
            };
          }
          return color;
        });
        newStockDeducted = false;
      }

      // Also update local copy of this order if it exists
      const updatedLocalOrders = current.orders.map((o) =>
        o.id === orderId ? { ...o, status, stockDeducted: newStockDeducted } : o
      );

      return { ...current, orders: updatedLocalOrders, colors: updatedColors };
    });

    // 2. Persist to Supabase
    await updateOrderStatusSupabase(orderId, status, newStockDeducted);

    // 3. Refresh canonical DB-backed data
    const refreshed = await fetchOrders();
    setSupabaseOrders(refreshed);
    await refreshData();
    setSyncMessage("تم تحديث حالة الطلب والمخزون في قاعدة البيانات بنجاح.");
  }

  async function syncBaseStoreData() {
    const confirmed = window.confirm(
      "سيتم تحديث التصنيفات والبراندات ومناطق التوصيل والبانرات فقط.\nالمنتجات والطلبات الحالية لن تُحذف.\nهل تريدين المتابعة؟"
    );
    if (!confirmed) return;

    await syncStructureCatalog(initialStoreData);
    await refreshData();
    setSyncMessage("تم تحديث التصنيفات والبراندات ومناطق التوصيل. المنتجات والطلبات وإعدادات التواصل لم تُمس.");
  }

  async function handleLogout() {
    const supabase = createBrowserSupabaseClient();

    setIsLoggingOut(true);
    setSyncError("");
    setSyncMessage("");

    try {
      if (supabase) {
        const { error } = await supabase.auth.signOut({ scope: "global" });
        if (error) {
          throw error;
        }
      }

      await fetch("/api/admin/logout", { method: "POST", credentials: "include" });

      if (typeof window !== "undefined") {
        window.localStorage.removeItem("flora-style-admin-data-v2");
      }

      window.location.assign("/admin/login?signedout=1");
    } catch (error) {
      setSyncError(formatAdminError(error, "تعذر تسجيل الخروج."));
      setIsLoggingOut(false);
    }
  }

  return (
    <main className="admin-layout" dir="rtl">
      <aside className={`sidebar ${isMobileNavOpen ? "is-open" : ""}`}>
        <div className="sidebar-header">
          <Link className="brand" href="/">
            <Image className="brand-logo" src="/flora-logo.png" alt="Flora Style logo" width={48} height={48} priority />
            <span className="brand-name">
              <strong>Flora Style</strong>
              <span>Admin</span>
            </span>
          </Link>
          <button
            aria-controls="admin-nav-panel"
            aria-expanded={isMobileNavOpen}
            className="icon-button sidebar-toggle"
            onClick={() => setIsMobileNavOpen((open) => !open)}
            type="button"
          >
            <span>{isMobileNavOpen ? "إغلاق القائمة" : "أقسام اللوحة"}</span>
            <strong>{activeTabMeta?.label}</strong>
          </button>
        </div>
        <div className="sidebar-nav-shell" id="admin-nav-panel">
          <nav className="side-nav" aria-label="Admin sections">
            {tabs.map((tab) => (
              <button className={activeTab === tab.id ? "is-active" : ""} key={tab.id} onClick={() => setActiveTab(tab.id)} type="button">
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="sidebar-actions">
            <Link className="ghost-button" href="/">
              عرض المتجر
            </Link>
            <button className="danger-button sidebar-logout-button" disabled={isLoggingOut} onClick={handleLogout} type="button">
              {isLoggingOut ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}
            </button>
          </div>
        </div>
      </aside>
      <button
        aria-hidden={!isMobileNavOpen}
        className={`admin-sidebar-backdrop ${isMobileNavOpen ? "is-visible" : ""}`}
        onClick={() => setIsMobileNavOpen(false)}
        tabIndex={isMobileNavOpen ? 0 : -1}
        type="button"
      />

      <section className="admin-main">
        <header className="admin-header">
          <div>
            <p className="eyebrow">Flora Style Control Center</p>
            <h1>{activeTabMeta?.label}</h1>
            <p className="admin-header__body">لوحة إدارة متكاملة لإدارة الطلبات والمنتجات والوسائط بشكل مباشر من قاعدة البيانات.</p>
          </div>
          <div className="admin-header__actions">
            <button className="ghost-button" onClick={syncBaseStoreData} type="button">
              تحديث التصنيفات والبراندات
            </button>
          </div>
        </header>

        <div className="admin-inline-notice admin-inline-notice--success">
          بيانات المنتجات محفوظة في قاعدة البيانات. الحذف الجماعي للكتالوج معطّل لحماية عملك.
        </div>

        {syncMessage ? (
          <div className="admin-flash admin-flash--success">
            {syncMessage}
          </div>
        ) : null}
        {syncError ? <div className="admin-flash admin-flash--error">{syncError}</div> : null}

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
                <OrdersTable
                  data={{
                    ...data,
                    orders:
                      supabaseAvailable && supabaseOrders.length > 0
                        ? supabaseOrders.slice(0, 6)
                        : data.orders,
                  }}
                  onDelete={(id) => deleteById("orders", id)}
                  onStatusChange={updateOrderStatus}
                />
              </div>
              <div className="admin-panel">
                <PanelTitle title="تنبيهات المخزون" hint="الألوان التي تحتاج متابعة." />
                <div className="grid" style={{ gap: "10px", marginTop: "14px" }}>
                  {[...stats.lowStock, ...stats.outOfStock].map((color) => {
                    const product = data.products.find((entry) => entry.id === color.productId);
                    return (
                      <div className="metric metric--compact" key={color.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px" }}>
                        <div className="metric__content">
                          <strong style={{ fontSize: "16px", margin: 0 }}>{product?.nameAr ?? "منتج"}</strong>
                          <span className="metric__subtle">{color.nameAr}</span>
                        </div>
                        <span className={`status-pill ${color.stockQuantity === 0 ? "status-pill--danger" : "status-pill--warning"}`}>
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
                  {textInput<Product>(
                    "رمز المنتج (كود المخزون)",
                    productDraft.sku,
                    "sku",
                    setProductDraft,
                    "text",
                    "مثال: FL-BAG-001"
                  )}
                  {textInput<Product>("السعر", productDraft.price, "price", setProductDraft, "number")}
                  {textInput<Product>("سعر التخفيض (اختياري)", productDraft.salePrice ?? "", "salePrice", setProductDraft, "number")}
                  <label className="form-row">
                    <span>رابط المنتج (يُنشأ تلقائياً)</span>
                    <input
                      className="input"
                      readOnly
                      value={buildProductSlug({ ...productDraft, id: productDraft.id || "prod-preview" })}
                    />
                  </label>
                  <label className="form-row">
                    <span>المخزون الافتراضي (إذا لم تُضاف ألوان بعد)</span>
                    <input
                      className="input"
                      min={0}
                      onChange={(event) => setProductDefaultStock(Number(event.target.value))}
                      type="number"
                      value={productDefaultStock}
                    />
                  </label>
                  <AdminPicker
                    label="التصنيف"
                    onChange={(categoryId) => setProductDraft({ ...productDraft, categoryId })}
                    options={data.categories.map((category) => ({ id: category.id, label: category.nameAr }))}
                    value={productDraft.categoryId}
                  />
                  <AdminPicker
                    emptyLabel="اختر براند"
                    label="البراند"
                    onChange={(brandId) => setProductDraft({ ...productDraft, brandId })}
                    options={data.brands.map((brand) => ({ id: brand.id, label: brand.nameAr }))}
                    searchPlaceholder="ابحثي عن براند..."
                    searchable
                    value={productDraft.brandId}
                  />
                </div>
                <Textarea label="الوصف القصير عربي" value={productDraft.descriptionAr} onChange={(value) => setProductDraft({ ...productDraft, descriptionAr: value })} />
                <Textarea label="الوصف القصير عبري" value={productDraft.descriptionHe} onChange={(value) => setProductDraft({ ...productDraft, descriptionHe: value })} />
                <Textarea label="قصة المنتج الكاملة عربي (تفاصيل الصفحة)" value={productDraft.storyAr} onChange={(value) => setProductDraft({ ...productDraft, storyAr: value })} />
                <Textarea label="قصة المنتج الكاملة عبري (تفاصيل الصفحة)" value={productDraft.storyHe} onChange={(value) => setProductDraft({ ...productDraft, storyHe: value })} />
                <ProductGalleryField
                  images={productDraft.images}
                  isUploading={uploadingField === "صور المنتج"}
                  onRemove={removeProductImage}
                  onUpload={handleProductImagesUpload}
                />
                <section className="admin-color-rows">
                  <div className="admin-section-head">
                    <strong>ألوان المنتج والمخزون</strong>
                    <p className="muted">أضيفي كل لون متوفر وحددي الكمية المتبقية لكل لون.</p>
                  </div>
                  {productColorDrafts.map((row, index) => (
                    <div className="admin-color-row" key={row.id || `color-row-${index}`}>
                      <div className="admin-color-row__swatch">
                        <span className="swatch" style={{ background: row.value || "#d4af37" }} />
                        <input
                          className="field"
                          onChange={(event) => updateProductColorRow(index, { value: event.target.value })}
                          placeholder="#d4af37"
                          type="text"
                          value={row.value}
                        />
                      </div>
                      <input
                        className="field"
                        onChange={(event) => updateProductColorRow(index, { nameAr: event.target.value })}
                        placeholder="اللون عربي"
                        type="text"
                        value={row.nameAr}
                      />
                      <input
                        className="field"
                        onChange={(event) => updateProductColorRow(index, { nameHe: event.target.value })}
                        placeholder="اللون عبري"
                        type="text"
                        value={row.nameHe}
                      />
                      <input
                        className="field"
                        min={0}
                        onChange={(event) => updateProductColorRow(index, { stockQuantity: Number(event.target.value) })}
                        placeholder="الكمية"
                        type="number"
                        value={row.stockQuantity}
                      />
                      <button className="ghost-button" onClick={() => removeProductColorRow(index)} type="button">
                        حذف
                      </button>
                    </div>
                  ))}
                  <button className="ghost-button" onClick={addProductColorRow} type="button">
                    + إضافة لون
                  </button>
                </section>
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
            <ProductsTable data={data} onEdit={beginEditProduct} onDelete={(id) => deleteById("products", id)} />
          </CrudLayout>
        ) : null}

        {activeTab === "inventory" ? (
          <CrudLayout
            title="إدارة الألوان والمخزون"
            form={
              <form className="form-grid" onSubmit={saveColor}>
                <AdminPicker
                  emptyLabel="اختر المنتج"
                  label="المنتج"
                  onChange={(productId) => setColorDraft({ ...colorDraft, productId })}
                  options={data.products.map((product) => ({
                    id: product.id,
                    imageUrl: product.images[0],
                    label: `${product.nameAr} (${product.sku})`,
                  }))}
                  searchPlaceholder="ابحثي عن منتج..."
                  searchable
                  value={colorDraft.productId}
                />
                {colorDraft.productId ? (
                  <AdminProductPreview product={data.products.find((product) => product.id === colorDraft.productId) ?? blankProduct()} />
                ) : null}
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
            <PanelTitle
              title="إدارة الطلبات المستلمة"
              hint={
                supabaseAvailable
                  ? "الطلبات تُحدَّث مباشرة من قاعدة البيانات. عند تغيير الحالة سينعكس التحديث فوراً في اللوحة."
                  : "قاعدة البيانات غير متصلة حالياً. الطلبات ستظهر محلياً في هذا المتصفح فقط."
              }
            />

            {supabaseAvailable ? (
              <div className="admin-inline-notice admin-inline-notice--success">
                ✓ متصل بقاعدة البيانات — الطلبات الجديدة ستظهر هنا فوراً من أي جهاز.
              </div>
            ) : (
              <div className="admin-inline-notice admin-inline-notice--warning">
                اتصال قاعدة البيانات غير مفعّل بعد. راجع إعدادات الربط في السيرفر ثم أعد تشغيل الموقع.
              </div>
            )}

            {ordersLoading ? (
              <div className="admin-loading-state">جاري تحميل الطلبات من قاعدة البيانات...</div>
            ) : (
              <OrdersTable
                data={{
                  ...data,
                  orders: supabaseAvailable && supabaseOrders.length > 0 ? supabaseOrders : data.orders,
                }}
                onDelete={(id) => {
                  // For Supabase orders we don't delete from local only
                  // We keep delete local for demo data. In real usage you can add a delete function.
                  deleteById("orders", id);
                }}
                onStatusChange={handleSupabaseOrderStatusChange}
              />
            )}
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
            imageLabel="صورة التصنيف"
            isUploading={uploadingField === "صورة التصنيف"}
            onUpload={(file) =>
              handleSingleAssetUpload(file, "categories", (url) => setCategoryDraft((current) => ({ ...current, imageUrl: url })), "صورة التصنيف")
            }
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
            imageLabel="شعار البراند"
            isUploading={uploadingField === "شعار البراند"}
            onUpload={(file) =>
              handleSingleAssetUpload(file, "brands", (url) => setBrandDraft((current) => ({ ...current, logoUrl: url })), "شعار البراند")
            }
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
                </div>
                <MediaField
                  isUploading={uploadingField === "صورة البانر"}
                  label="صورة البانر"
                  onClear={() => setBannerDraft((current) => ({ ...current, imageUrl: "" }))}
                  onUpload={(file) =>
                    handleSingleAssetUpload(file, "banners", (url) => setBannerDraft((current) => ({ ...current, imageUrl: url })), "صورة البانر")
                  }
                  value={bannerDraft.imageUrl}
                />
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
            <PanelTitle
              title="إعدادات المتجر العامة"
              hint="روابط التواصل (واتساب، إنستغرام، تيك توك، فيسبوك، البريد) تظهر في تذييل الموقع والقائمة الجانبية. اتركي الحقل فارغاً لإخفائه."
            />
            <form className="form-grid" onSubmit={saveSettings} style={{ marginTop: "20px" }}>
              <div className="two-col form-grid">
                {textInput<StoreSettings>("اسم المتجر", settingsDraft.storeName, "storeName", setSettingsDraft)}
                {textInput<StoreSettings>("رقم واتساب / الهاتف (مثال: 972595405245)", settingsDraft.whatsappNumber, "whatsappNumber", setSettingsDraft)}
                {textInput<StoreSettings>("رابط إنستغرام", settingsDraft.instagramUrl, "instagramUrl", setSettingsDraft)}
                {textInput<StoreSettings>("رابط تيك توك", settingsDraft.tiktokUrl, "tiktokUrl", setSettingsDraft)}
                {textInput<StoreSettings>("رابط فيسبوك", settingsDraft.facebookUrl, "facebookUrl", setSettingsDraft)}
                {textInput<StoreSettings>("البريد الإلكتروني", settingsDraft.email, "email", setSettingsDraft)}
              </div>
              <Textarea label="العنوان الجغرافي عربي" value={settingsDraft.addressAr} onChange={(value) => setSettingsDraft({ ...settingsDraft, addressAr: value })} />
              <Textarea label="العنوان الجغرافي عبري" value={settingsDraft.addressHe} onChange={(value) => setSettingsDraft({ ...settingsDraft, addressHe: value })} />
              <button className="button">حفظ الإعدادات</button>
            </form>
          </div>
        ) : null}

        {activeTab === "accounts" ? (
          <div className="admin-grid">
            <div className="admin-panel">
              <PanelTitle
                title="الحسابات الإدارية الحالية"
                hint="كل حساب هنا يمكنه الدخول إلى لوحة الأدمن وإدارة المتجر."
              />
              {!serviceRoleConfigured ? (
                <div className="admin-note admin-note--warning">
                  لإضافة حسابات أدمن جديدة من داخل اللوحة، يجب إكمال إعدادات السيرفر أولاً ثم إعادة تشغيل الموقع.
                </div>
              ) : null}
              {accountsLoading ? (
                <div className="empty">جاري تحميل حسابات الأدمن...</div>
              ) : (
                <div className="admin-accounts-list">
                  {adminAccounts.map((account) => (
                    <div className="admin-account-card" key={account.user_id}>
                      <div>
                        <strong>{account.display_name || "Admin User"}</strong>
                        <span>{account.email}</span>
                      </div>
                      <small>{new Date(account.created_at).toLocaleDateString("en-GB")}</small>
                    </div>
                  ))}
                  {!adminAccounts.length ? <div className="empty">لا توجد حسابات أدمن إضافية حتى الآن.</div> : null}
                </div>
              )}
            </div>

            <div className="admin-panel">
              <PanelTitle
                title="إضافة حساب أدمن جديد"
                hint="سيُنشأ الحساب الجديد ويُضاف مباشرة إلى صلاحيات لوحة الأدمن."
              />
              <form className="form-grid" onSubmit={createAdditionalAdmin}>
                {textInput<AdminAccountDraft>("اسم العرض", accountDraft.displayName, "displayName", setAccountDraft)}
                {textInput<AdminAccountDraft>("البريد الإلكتروني", accountDraft.email, "email", setAccountDraft)}
                {textInput<AdminAccountDraft>("كلمة المرور", accountDraft.password, "password", setAccountDraft, "password")}
                <button className="button" disabled={accountsLoading || !serviceRoleConfigured}>
                  {accountsLoading ? "جاري الإنشاء..." : "إنشاء حساب أدمن"}
                </button>
              </form>
            </div>
          </div>
        ) : null}

        {activeTab === "profile" ? (
          <div className="admin-grid">
            <div className="admin-panel">
              <PanelTitle
                title="بيانات حساب الأدمن"
                hint="هذا الحساب هو المستخدم الحالي المسجل دخوله إلى لوحة التحكم."
              />
              <div className="admin-accounts-list">
                <div className="admin-account-card">
                  <div>
                    <strong>البريد الإلكتروني</strong>
                    <span>{profileDraft.email || "-"}</span>
                  </div>
                  <small>حساب إداري</small>
                </div>
              </div>
            </div>

            <div className="admin-panel">
              <PanelTitle
                title="تغيير كلمة المرور"
                hint="غيّر كلمة مرور الأدمن الحالي مباشرة من داخل الحساب."
              />
              <form className="form-grid" onSubmit={updateMyPassword}>
                {textInput<AdminProfileDraft>("كلمة المرور الجديدة", profileDraft.newPassword, "newPassword", setProfileDraft, "password")}
                {textInput<AdminProfileDraft>("تأكيد كلمة المرور الجديدة", profileDraft.confirmPassword, "confirmPassword", setProfileDraft, "password")}
                <button className="button" disabled={accountsLoading}>
                  {accountsLoading ? "جاري الحفظ..." : "حفظ كلمة المرور الجديدة"}
                </button>
              </form>
            </div>
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
    images: [],
    bestSeller: false,
    featured: false,
    active: true,
    createdAt: new Date().toISOString().slice(0, 10)
  };
}

function blankCategory(): Category {
  return { id: "", slug: "", nameAr: "", nameHe: "", descriptionAr: "", descriptionHe: "", imageUrl: "", active: true };
}

function blankBrand(): Brand {
  return { id: "", slug: "", nameAr: "", nameHe: "", descriptionAr: "", descriptionHe: "", logoUrl: "", active: true };
}

function blankColor(productId: string): ProductColor {
  return { id: "", productId, nameAr: "", nameHe: "", value: "#d4af37", stockQuantity: 1 };
}

type ProductColorFormRow = {
  id: string;
  nameAr: string;
  nameHe: string;
  value: string;
  stockQuantity: number;
};

function blankProductColorRow(): ProductColorFormRow {
  return { id: "", nameAr: "", nameHe: "", value: "#d4af37", stockQuantity: 1 };
}

function mapColorToFormRow(color: ProductColor): ProductColorFormRow {
  return {
    id: color.id,
    nameAr: color.nameAr,
    nameHe: color.nameHe,
    value: color.value,
    stockQuantity: color.stockQuantity,
  };
}

function blankZone(): DeliveryZone {
  return { id: "", nameAr: "", nameHe: "", deliveryFee: 0, active: true };
}

function blankBanner(): Banner {
  return { id: "", titleAr: "", titleHe: "", subtitleAr: "", subtitleHe: "", imageUrl: "", active: true };
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
    <div className="section-head">
      <h2>{title}</h2>
      <p>{hint}</p>
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

function MediaField({
  label,
  value,
  onUpload,
  onClear,
  isUploading,
}: {
  label: string;
  value: string;
  onUpload: (file: File | null) => void;
  onClear: () => void;
  isUploading: boolean;
}) {
  return (
    <div className="form-row">
      <span>{label}</span>
      <div className="media-field">
        <label className="media-field__picker">
          <input accept="image/*" hidden onChange={(event) => onUpload(event.target.files?.[0] ?? null)} type="file" />
          <span>{isUploading ? "جاري الرفع..." : "رفع صورة"}</span>
        </label>
        {value ? (
          <div className="media-field__preview">
            <div className="media-field__preview-image">
              <Image alt={label} fill src={value} sizes="120px" />
            </div>
            <div className="media-field__preview-meta">
              <small>{value}</small>
              <button className="ghost-button" onClick={onClear} type="button">
                حذف الصورة
              </button>
            </div>
          </div>
        ) : (
          <div className="media-field__empty">لم يتم رفع صورة بعد.</div>
        )}
      </div>
    </div>
  );
}

function ProductGalleryField({
  images,
  onUpload,
  onRemove,
  isUploading,
}: {
  images: string[];
  onUpload: (files: FileList | null) => void;
  onRemove: (index: number) => void;
  isUploading: boolean;
}) {
  return (
    <div className="form-row">
      <span>صور المنتج</span>
      <div className="media-gallery">
        <label className="media-field__picker">
          <input accept="image/*" hidden multiple onChange={(event) => onUpload(event.target.files)} type="file" />
          <span>{isUploading ? "جاري رفع الصور..." : "رفع صور المعرض"}</span>
        </label>
        <div className="media-gallery__grid">
          {images.map((image, index) => (
            <div className="media-gallery__item" key={`${image}-${index}`}>
              <div className="media-gallery__image">
                <Image alt={`Product image ${index + 1}`} fill src={image} sizes="160px" />
              </div>
              <button className="danger-button" onClick={() => onRemove(index)} type="button">
                حذف
              </button>
            </div>
          ))}
          {!images.length ? <div className="media-field__empty">ارفع صورة واحدة أو أكثر للمنتج.</div> : null}
        </div>
      </div>
    </div>
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
    <div className="table-wrap admin-mobile-table">
      <table>
        <thead>
          <tr>
            <th>المنتج</th>
            <th>رمز المنتج</th>
            <th>السعر</th>
            <th>الحالة</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {data.products.map((product) => {
            return (
              <tr key={product.id}>
                <td data-label="المنتج">
                  <div className="admin-product-cell">
                    <AdminProductThumb imageUrl={product.images[0]} label={product.nameAr} />
                    <div>
                      <strong>{product.nameAr}</strong>
                      <br />
                      <span className="muted">{product.nameHe}</span>
                    </div>
                  </div>
                </td>
                <td data-label="رمز المنتج">{product.sku}</td>
                <td data-label="السعر">{formatPrice(product.salePrice || product.price)}</td>
                <td data-label="الحالة">
                  <span className={`status-pill ${product.active ? "status-pill--success" : "status-pill--danger"}`}>
                    {product.active ? "نشط" : "معطل"}
                  </span>
                </td>
                <td data-label="إجراءات">
                  <div className="table-action-group">
                    <button className="ghost-button" onClick={() => onEdit(product)} type="button">
                    تعديل
                    </button>
                    <button className="danger-button" onClick={() => onDelete(product.id)} type="button">
                    حذف
                    </button>
                  </div>
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
    <div className="table-wrap admin-mobile-table">
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
                <td data-label="المنتج">
                  <div className="admin-product-cell">
                    <AdminProductThumb imageUrl={product?.images[0]} label={product?.nameAr ?? "-"} />
                    <div>
                      <strong>{product?.nameAr ?? "-"}</strong>
                      <br />
                      <span className="muted">{product?.sku ?? "-"}</span>
                    </div>
                  </div>
                </td>
                <td data-label="اللون">
                  <span className="swatch" style={{ background: color.value }} /> {color.nameAr}
                  <br />
                  <small className="muted">{color.nameHe} / {color.value}</small>
                </td>
                <td data-label="المخزون">
                  <strong className={color.stockQuantity <= 3 ? "stock-value stock-value--low" : "stock-value"}>
                    {color.stockQuantity}
                  </strong>
                </td>
                <td data-label="إجراءات">
                  <div className="table-action-group">
                    <button className="ghost-button" onClick={() => onEdit(color)} type="button">
                    تعديل
                    </button>
                    <button className="danger-button" onClick={() => onDelete(color.id)} type="button">
                    حذف
                    </button>
                  </div>
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

  const getStatusTone = (status: OrderStatus) => {
    switch (status) {
      case "Confirmed":
      case "Delivered":
        return "success";
      case "Pending":
        return "warning";
      case "Cancelled":
        return "danger";
      default:
        return "neutral";
    }
  };

  return (
    <>
      <div className="table-wrap admin-desktop-only">
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
                    <td className="order-total">{formatPrice(order.totalPrice)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select
                        className={`select status-select status-select--${getStatusTone(order.status)}`}
                        value={order.status}
                        onChange={(event) => onStatusChange(order.id, event.target.value as OrderStatus)}
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)} قطع</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button className="danger-button" onClick={() => onDelete(order.id)} type="button">
                        حذف
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="order-details-expanded">
                      <td className="order-details-cell" colSpan={6}>
                        <OrderDetails data={data} order={order} zoneName={zone ? zone.nameAr : "-"} />
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

      <div className="admin-order-cards admin-mobile-only">
        {data.orders.map((order) => {
          const zone = data.deliveryZones.find((z) => z.id === order.deliveryZoneId);
          const isExpanded = expandedOrderId === order.id;

          return (
            <article className={`admin-order-card ${isExpanded ? "is-expanded" : ""}`} key={order.id}>
              <button
                className="admin-order-card__summary"
                onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                type="button"
              >
                <div className="admin-order-card__title">
                  <strong>#{order.orderNumber}</strong>
                  <span>{order.createdAt}</span>
                </div>
                <div className="admin-order-card__meta">
                  <strong>{order.customerName}</strong>
                  <span>{order.phoneNumber}</span>
                </div>
                <div className="admin-order-card__badges">
                  <span className="status-pill">{order.items.reduce((sum, item) => sum + item.quantity, 0)} قطع</span>
                  <span className="status-pill status-pill--neutral">{formatPrice(order.totalPrice)}</span>
                </div>
              </button>

              <div className="admin-order-card__controls">
                <label className="form-row">
                  <span>حالة الطلب</span>
                  <select
                    className={`select status-select status-select--${getStatusTone(order.status)}`}
                    value={order.status}
                    onChange={(event) => onStatusChange(order.id, event.target.value as OrderStatus)}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="danger-button" onClick={() => onDelete(order.id)} type="button">
                  حذف
                </button>
              </div>

              {isExpanded ? (
                <div className="admin-order-card__details">
                  <OrderDetails data={data} order={order} zoneName={zone ? zone.nameAr : "-"} />
                </div>
              ) : null}
            </article>
          );
        })}
        {data.orders.length === 0 ? <div className="empty">لا توجد طلبات مستلمة حتى الآن.</div> : null}
      </div>
    </>
  );
}

function OrderDetails({ data, order, zoneName }: { data: StoreData; order: Order; zoneName: string }) {
  return (
    <div className="order-details-grid">
      <div>
        <h4 className="order-details-title">
          تفاصيل العميل والتوصيل
        </h4>
        <div className="order-details-copy">
          <p><strong>الاسم بالكامل:</strong> {order.customerName}</p>
          <p><strong>رقم الهاتف:</strong> {order.phoneNumber}</p>
          <p><strong>منطقة التوصيل:</strong> {zoneName}</p>
          <p><strong>العنوان المفصل:</strong> {order.detailedAddress}</p>
          <p><strong>ملاحظات العميل:</strong> {order.notes || "-"}</p>
          <p>
            <strong>حالة الخصم من المخزون:</strong>{" "}
            <span className={`status-pill ${order.stockDeducted ? "status-pill--success" : "status-pill--warning"}`}>
              {order.stockDeducted ? "تم الخصم تلقائياً" : "لم يخصم بعد"}
            </span>
          </p>
        </div>
      </div>
      <div>
        <h4 className="order-details-title">
          المنتجات المطلوبة
        </h4>
        <div className="order-details-lines">
          {order.items.map((item, idx) => {
            const prod = data.products.find((p) => p.id === item.productId);
            const col = data.colors.find((c) => c.id === item.colorId);
            const imageUrl = prod?.images?.[0];

            return (
              <div className="order-details-line" key={idx}>
                {imageUrl ? (
                  <Image
                    alt={prod ? prod.nameAr : "منتج"}
                    className="order-details-line__image"
                    height={56}
                    src={imageUrl}
                    width={48}
                  />
                ) : (
                  <div aria-hidden="true" className="order-details-line__image order-details-line__image--placeholder" />
                )}
                <div className="order-details-line__content">
                  <strong>{prod ? prod.nameAr : "منتج غير موجود"}</strong>
                  <span className="order-details-meta">
                    اللون: {col ? col.nameAr : "-"}
                  </span>
                </div>
                <span className="order-details-price">
                  {item.quantity} × {formatPrice(item.price)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="order-details-totals">
          <div>
            <span>مجموع المنتجات:</span>
            <strong>{formatPrice(order.subtotal)}</strong>
          </div>
          <div>
            <span>تكلفة التوصيل:</span>
            <strong>{formatPrice(order.deliveryFee)}</strong>
          </div>
          <div className="order-details-grand-total">
            <span>الإجمالي الكلي:</span>
            <strong>{formatPrice(order.totalPrice)}</strong>
          </div>
        </div>
      </div>
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
  imageLabel,
  isUploading,
  onUpload
}: {
  title: string;
  draft: T;
  setDraft: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  rows: T[];
  onEdit: React.Dispatch<React.SetStateAction<any>>;
  onDelete: (id: string) => void;
  imageLabel: string;
  isUploading: boolean;
  onUpload: (file: File | null) => void;
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
          </div>
          <MediaField
            isUploading={isUploading}
            label={imageLabel}
            onClear={() => setImageValue("")}
            onUpload={onUpload}
            value={imageValue}
          />
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
    <div className="table-wrap admin-mobile-table">
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
                <td data-label={String(column)} key={String(column)}>{formatCell(row[column])}</td>
              ))}
              <td data-label="إجراءات">
                <div className="table-action-group">
                  <button className="ghost-button" onClick={() => onEdit(row)} type="button">
                  تعديل
                  </button>
                  <button className="danger-button" onClick={() => onDelete(row.id)} type="button">
                  حذف
                  </button>
                </div>
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
