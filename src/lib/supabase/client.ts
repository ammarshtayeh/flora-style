import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Support both legacy anon key and the new publishable key format
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[Supabase] NEXT_PUBLIC_SUPABASE_URL or key is missing. Running in local-only mode (orders will not sync to admin from other devices)."
  );
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

export const isSupabaseEnabled = () => !!supabase;

export const getSupabaseConfigStatus = () => ({
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  keyType: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ? "publishable"
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? "anon"
    : "none",
});
