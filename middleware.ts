import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function redirectWithSessionCookies(url: URL, sessionResponse: NextResponse) {
  const redirect = NextResponse.redirect(url);
  sessionResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie);
  });
  return redirect;
}

export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);

  if (!supabaseUrl || !supabasePublishableKey || !supabase) {
    return response;
  }

  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) {
    return response;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const { data: adminRecord } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRecord) {
    await supabase.auth.signOut({ scope: "global" });
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("blocked", "1");
    return redirectWithSessionCookies(url, response);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
