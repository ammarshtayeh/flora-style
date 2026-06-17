import { supabase, isSupabaseEnabled } from "./client";
import type { Order, OrderStatus } from "@/lib/store";

export { isSupabaseEnabled };

export type SupabaseOrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  phone_number: string;
  delivery_zone_id: string | null;
  detailed_address: string;
  notes: string | null;
  subtotal: number;
  delivery_fee: number;
  total_price: number;
  status: OrderStatus;
  stock_deducted: boolean;
  created_at: string;
};

export type SupabaseOrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  color_id: string | null;
  quantity: number;
  price: number;
};

/**
 * Convert DB row + items to our frontend Order shape.
 */
function mapOrderRow(row: SupabaseOrderRow, items: SupabaseOrderItemRow[]): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    phoneNumber: row.phone_number,
    deliveryZoneId: row.delivery_zone_id || "",
    detailedAddress: row.detailed_address,
    notes: row.notes || "",
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    totalPrice: Number(row.total_price),
    status: row.status,
    stockDeducted: row.stock_deducted,
    createdAt: row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
    items: items.map((it) => ({
      productId: it.product_id || "",
      colorId: it.color_id || "",
      quantity: it.quantity,
      price: Number(it.price),
    })),
  };
}

export async function createOrder(order: Order): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(order),
    });

    const payload = (await response.json()) as {
      success?: boolean;
      error?: string;
    };

    if (!response.ok || !payload.success) {
      return {
        success: false,
        error: payload.error || "Failed to save order to Supabase",
      };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[Supabase] createOrder failed", err);
    return { success: false, error: err?.message || "Failed to save order to Supabase" };
  }
}

/**
 * Fetch all orders from Supabase (newest first).
 */
export async function fetchOrders(): Promise<Order[]> {
  if (!isSupabaseEnabled() || !supabase) {
    return [];
  }

  try {
    const { data: ordersData, error: ordersErr } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (ordersErr) throw ordersErr;
    if (!ordersData || ordersData.length === 0) return [];

    const orderIds = ordersData.map((o: any) => o.id);

    const { data: itemsData, error: itemsErr } = await supabase
      .from("order_items")
      .select("*")
      .in("order_id", orderIds);

    if (itemsErr) throw itemsErr;

    const itemsByOrder = new Map<string, SupabaseOrderItemRow[]>();
    (itemsData || []).forEach((item: any) => {
      const list = itemsByOrder.get(item.order_id) || [];
      list.push(item as SupabaseOrderItemRow);
      itemsByOrder.set(item.order_id, list);
    });

    return (ordersData as SupabaseOrderRow[]).map((row) =>
      mapOrderRow(row, itemsByOrder.get(row.id) || [])
    );
  } catch (err) {
    console.error("[Supabase] fetchOrders failed", err);
    return [];
  }
}

/**
 * Update order status (and stock_deducted flag) in Supabase.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  stockDeducted: boolean
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseEnabled() || !supabase) {
    return { success: true };
  }

  try {
    const { error } = await supabase.rpc("set_order_status", {
      p_order_id: orderId,
      p_status: status,
    });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("[Supabase] updateOrderStatus failed", err);
    return { success: false, error: err?.message };
  }
}

/**
 * Optional: real-time subscription helper.
 * Returns an unsubscribe function.
 */
export function subscribeToOrders(callback: (orders: Order[]) => void) {
  if (!isSupabaseEnabled() || !supabase) {
    return () => {};
  }

  if (!supabase) return () => {};

  const channel = supabase
    .channel("orders-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      async () => {
        const fresh = await fetchOrders();
        callback(fresh);
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "order_items" },
      async () => {
        // Re-fetch full list with items on any change
        const fresh = await fetchOrders();
        callback(fresh);
      }
    )
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
}

export async function fetchOrderById(orderId: string): Promise<Order | null> {
  if (!isSupabaseEnabled() || !supabase) {
    return null;
  }

  try {
    const { data: orderRow, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !orderRow) return null;

    const { data: itemsRows, error: itemsErr } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (itemsErr) return null;

    return mapOrderRow(orderRow as SupabaseOrderRow, (itemsRows ?? []) as SupabaseOrderItemRow[]);
  } catch (error) {
    console.error("[Supabase] fetchOrderById failed", error);
    return null;
  }
}
