import { loadStoreData } from "./db";
import type { ProductColor } from "./store";

import { syncOneSignalCartTag } from "./onesignal";

export type CartItem = {
  productId: string;
  colorId: string;
  quantity: number;
};

const CART_KEY = "flora-style-cart";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(CART_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
}

export function saveCart(cart: CartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  syncOneSignalCartTag(cart.length > 0);
  window.dispatchEvent(new CustomEvent("flora-cart-updated", { detail: cart }));
}

export function addToCart(
  productId: string,
  colorId: string,
  qty = 1,
  options?: { colors?: ProductColor[] }
): CartItem[] {
  const data = loadStoreData();
  const colorSource = options?.colors ?? data.colors;
  const color = colorSource.find((c) => c.id === colorId && c.productId === productId);
  if (!color || color.stockQuantity <= 0) return getCart();

  const currentCart = getCart();
  const existingIndex = currentCart.findIndex((item) => item.productId === productId && item.colorId === colorId);

  if (existingIndex > -1) {
    const newQty = Math.min(currentCart[existingIndex].quantity + qty, color.stockQuantity);
    currentCart[existingIndex].quantity = newQty;
  } else {
    const newQty = Math.min(qty, color.stockQuantity);
    if (newQty > 0) {
      currentCart.push({ productId, colorId, quantity: newQty });
    }
  }

  saveCart(currentCart);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("flora-cart-added", { detail: productId }));
  }
  return currentCart;
}

export function updateCartQty(productId: string, colorId: string, qty: number): CartItem[] {
  const data = loadStoreData();
  const color = data.colors.find((c) => c.id === colorId && c.productId === productId);
  if (!color) return getCart();

  let currentCart = getCart();
  const existingIndex = currentCart.findIndex((item) => item.productId === productId && item.colorId === colorId);

  if (existingIndex > -1) {
    const newQty = Math.min(qty, color.stockQuantity);
    if (newQty <= 0) {
      currentCart = currentCart.filter((item) => !(item.productId === productId && item.colorId === colorId));
    } else {
      currentCart[existingIndex].quantity = newQty;
    }
  }

  saveCart(currentCart);
  return currentCart;
}

export function changeCartColor(productId: string, oldColorId: string, newColorId: string): CartItem[] {
  const data = loadStoreData();
  const newColor = data.colors.find((c) => c.id === newColorId && c.productId === productId);
  if (!newColor) return getCart();

  let currentCart = getCart();
  const oldIndex = currentCart.findIndex((item) => item.productId === productId && item.colorId === oldColorId);
  if (oldIndex === -1) return currentCart;

  const qty = currentCart[oldIndex].quantity;
  // Remove old color
  currentCart = currentCart.filter((_, idx) => idx !== oldIndex);

  // Check if target color exists in cart
  const targetIndex = currentCart.findIndex((item) => item.productId === productId && item.colorId === newColorId);

  if (targetIndex > -1) {
    const combinedQty = Math.min(currentCart[targetIndex].quantity + qty, newColor.stockQuantity);
    currentCart[targetIndex].quantity = combinedQty;
  } else {
    const targetQty = Math.min(qty, newColor.stockQuantity);
    if (targetQty > 0) {
      currentCart.push({ productId, colorId: newColorId, quantity: targetQty });
    }
  }

  saveCart(currentCart);
  return currentCart;
}

export function removeFromCart(productId: string, colorId: string): CartItem[] {
  const currentCart = getCart().filter((item) => !(item.productId === productId && item.colorId === colorId));
  saveCart(currentCart);
  return currentCart;
}

export function clearCart(): void {
  saveCart([]);
}

export function subscribeToCart(callback: (cart: CartItem[]) => void) {
  if (typeof window === "undefined") return () => {};

  const handleUpdate = () => {
    callback(getCart());
  };

  window.addEventListener("flora-cart-updated", handleUpdate);
  window.addEventListener("storage", (e) => {
    if (e.key === CART_KEY) {
      handleUpdate();
    }
  });

  return () => {
    window.removeEventListener("flora-cart-updated", handleUpdate);
    window.removeEventListener("storage", handleUpdate);
  };
}
