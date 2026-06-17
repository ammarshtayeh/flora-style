import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin-dashboard";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Flora Style Admin"
};

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient();

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/admin/login");
    }

    const { data: adminRecord } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminRecord) {
      redirect("/admin/login?blocked=1");
    }
  }

  return <AdminDashboard />;
}
