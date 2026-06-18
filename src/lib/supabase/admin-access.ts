import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireAdminAccess() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { error: NextResponse.json({ error: "Supabase is not configured." }, { status: 500 }) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: admin } = await supabase
    .from("admins")
    .select("user_id,email,display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supabase, user, admin };
}

export async function isRegisteredAdmin(userId: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return false;
  }

  const { data: admin } = await supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  return !!admin;
}
