import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let browserClient: SupabaseClient | null = null;

export function createBrowserSupabaseClient() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!supabaseUrl || !supabasePublishableKey) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabasePublishableKey, {
      cookieOptions: {
        sameSite: "lax",
        secure: true,
      },
    });
  }

  return browserClient;
}

export const supabase = typeof window !== "undefined" ? createBrowserSupabaseClient() : null;

export const isSupabaseEnabled = () => !!supabaseUrl && !!supabasePublishableKey;

export const getSupabaseConfigStatus = () => ({
  hasUrl: !!supabaseUrl,
  hasKey: !!supabasePublishableKey,
  keyType: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ? "publishable"
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? "anon"
      : "none",
});
