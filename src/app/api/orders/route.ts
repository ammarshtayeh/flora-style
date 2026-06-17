import { NextResponse } from "next/server";
import type { Order } from "@/lib/store";
import { createWriteSupabaseClient } from "@/lib/supabase/service";

function isValidOrder(order: Partial<Order> | null | undefined): order is Order {
  return !!order &&
    typeof order.id === "string" &&
    typeof order.orderNumber === "string" &&
    typeof order.customerName === "string" &&
    typeof order.phoneNumber === "string" &&
    typeof order.detailedAddress === "string" &&
    typeof order.subtotal === "number" &&
    typeof order.deliveryFee === "number" &&
    typeof order.totalPrice === "number" &&
    Array.isArray(order.items);
}

export async function POST(request: Request) {
  const supabase = createWriteSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      {
        success: false,
        error: "Supabase environment is not configured on the server.",
      },
      { status: 500 }
    );
  }

  const payload = (await request.json()) as Partial<Order>;
  if (!isValidOrder(payload)) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid order payload.",
      },
      { status: 400 }
    );
  }

  const order = payload;

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

  if (orderError) {
    return NextResponse.json(
      {
        success: false,
        error: orderError.message,
      },
      { status: 400 }
    );
  }

  if (order.items.length) {
    const { error: itemsError } = await supabase.from("order_items").insert(
      order.items.map((item) => ({
        order_id: order.id,
        product_id: item.productId || null,
        color_id: item.colorId || null,
        quantity: item.quantity,
        price: item.price,
      }))
    );

    if (itemsError) {
      await supabase.from("orders").delete().eq("id", order.id);
      return NextResponse.json(
        {
          success: false,
          error: itemsError.message,
        },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
