import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient, isServiceRoleConfigured } from "@/lib/supabase/service";

async function requireAdmin() {
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
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user };
}

export async function GET() {
  const access = await requireAdmin();
  if (access.error) {
    return access.error;
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("admins")
    .select("user_id,email,display_name,created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    accounts: data ?? [],
    serviceRoleConfigured: isServiceRoleConfigured(),
  });
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if (access.error) {
    return access.error;
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is required to create additional admin accounts." },
      { status: 500 }
    );
  }

  const service = createServiceSupabaseClient();
  if (!service) {
    return NextResponse.json({ error: "Service client is unavailable." }, { status: 500 });
  }

  const body = (await request.json()) as {
    email?: string;
    password?: string;
    displayName?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();
  const displayName = body.displayName?.trim() || "Admin User";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const { data: createdUser, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: displayName,
    },
  });

  if (createError || !createdUser.user) {
    return NextResponse.json({ error: createError?.message || "Failed to create auth user." }, { status: 400 });
  }

  const { error: adminInsertError } = await service.from("admins").upsert({
    user_id: createdUser.user.id,
    email,
    display_name: displayName,
  });

  if (adminInsertError) {
    return NextResponse.json({ error: adminInsertError.message }, { status: 400 });
  }

  return NextResponse.json({
    account: {
      user_id: createdUser.user.id,
      email,
      display_name: displayName,
      created_at: createdUser.user.created_at,
    },
    serviceRoleConfigured: true,
  });
}
