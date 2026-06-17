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

/**
 * Create a new order in Supabase (orders + order_items).
 * This is called from checkout in addition to local save.
 */
export async function createOrder(order: Order): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseEnabled() || !supabase) {
    // Supabase not configured — silently succeed (local mode handles it)
    return { success: true };
  }

  try {
    // 1. Insert main order
    const { error: orderError } = await supabase.from("orders").insert({
      id: order.id,
      order_number: order.orderNumber,
      customer_name: order.customerName,
      phone_number: order.phoneNumber,
      delivery_zone_id: order.deliveryZoneId || null,
      detailed_address: order.detailedAddress,
      notes: order.notes || null,
      subtotal: order.subtotal,
      delivery_fee: order.deliveryFee,
      total_price: order.totalPrice,
      status: order.status,
      stock_deducted: !!order.stockDeducted,
    });

    if (orderError) throw orderError;

    // 2. Insert items (if any)
    if (order.items.length > 0) {
      const itemsPayload = order.items.map((item) => ({
        order_id: order.id,
        product_id: item.productId || null,
        color_id: item.colorId || null,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(itemsPayload);
      if (itemsError) throw itemsError;
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
