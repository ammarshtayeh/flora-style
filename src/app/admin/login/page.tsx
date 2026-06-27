"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, Mail } from "lucide-react";
import { createBrowserSupabaseClient, isSupabaseEnabled } from "@/lib/supabase/client";
import { formatAdminError } from "@/lib/admin-messages";

async function ensureRegisteredAdmin(
  client: NonNullable<ReturnType<typeof createBrowserSupabaseClient>>,
  userId: string
) {
  const { data: adminRecord, error } = await client
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return !!adminRecord;
}

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const nextPath = searchParams?.get("next") || "/admin";
  const blocked = searchParams?.get("blocked") === "1";
  const signedOut = searchParams?.get("signedout") === "1";

  useEffect(() => {
    if (blocked) {
      setError("هذا الحساب غير مسجّل كأدمن. يمكن الدخول فقط بحسابات الأدمن المعتمدة.");
    }
    if (signedOut) {
      setNotice("تم تسجيل الخروج بنجاح. أدخل بيانات الأدمن للدخول مرة أخرى.");
    }
  }, [blocked, signedOut]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      setError("اتصال قاعدة البيانات غير مفعّل بعد. راجع إعدادات الربط ثم أعد تشغيل الموقع.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !signInData.user) {
      setError(formatAdminError(signInError, "تعذر تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى."));
      setLoading(false);
      return;
    }

    try {
      const isAdmin = await ensureRegisteredAdmin(supabase, signInData.user.id);
      if (!isAdmin) {
        await supabase.auth.signOut({ scope: "global" });
        await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
        setError("هذا الحساب غير مسجّل كأدمن. يمكن الدخول فقط بحسابات الأدمن المعتمدة.");
        setLoading(false);
        return;
      }
    } catch (authError) {
      await supabase.auth.signOut({ scope: "global" });
      setError(formatAdminError(authError, "تعذر التحقق من صلاحيات الأدمن."));
      setLoading(false);
      return;
    }

    window.location.assign(nextPath);
  }

  return (
    <main className="admin-auth-page" dir="rtl">
      <div className="admin-auth-card">
        <div className="admin-auth-card__head">
          <span className="luxury-kicker">Flora Style Admin</span>
          <h1>تسجيل دخول الأدمن</h1>
          <p>الدخول متاح فقط لحسابات الأدمن المسجّلة مسبقاً في لوحة التحكم.</p>
        </div>

        {!isSupabaseEnabled() ? (
          <div className="admin-auth-message is-error">
            اتصال قاعدة البيانات غير مفعّل بعد. راجع إعدادات الربط في السيرفر ثم أعد تشغيل الموقع.
          </div>
        ) : null}

        {notice ? <div className="admin-auth-message is-success">{notice}</div> : null}
        {error ? <div className="admin-auth-message is-error">{error}</div> : null}

        <form className="admin-auth-form" onSubmit={handleLogin}>
          <label className="form-row">
            <span>البريد الإلكتروني</span>
            <div className="admin-auth-input">
              <Mail size={16} />
              <input
                autoComplete="username"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </div>
          </label>

          <label className="form-row">
            <span>كلمة المرور</span>
            <div className="admin-auth-input">
              <ShieldCheck size={16} />
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
          </label>

          <button className="button" disabled={loading || !isSupabaseEnabled()} type="submit">
            {loading ? "جاري التحقق..." : "دخول"}
          </button>
        </form>

        <Link className="ghost-button" href="/">
          العودة للمتجر
        </Link>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<main className="admin-auth-page" dir="rtl" />}>
      <AdminLoginContent />
    </Suspense>
  );
}
