"use client";

import { useEffect } from "react";
import { getCart } from "@/lib/cart";
import { syncOneSignalCartTag } from "@/lib/onesignal";

export function OneSignalCartSync() {
  useEffect(() => {
    syncOneSignalCartTag(getCart().length > 0);

    const handleCartUpdate = () => {
      syncOneSignalCartTag(getCart().length > 0);
    };

    window.addEventListener("flora-cart-updated", handleCartUpdate);
    return () => window.removeEventListener("flora-cart-updated", handleCartUpdate);
  }, []);

  return null;
}
