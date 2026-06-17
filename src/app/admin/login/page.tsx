"use client";

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, Mail } from "lucide-react";
import { createBrowserSupabaseClient, isSupabaseEnabled } from "@/lib/supabase/client";
import { formatAdminError } from "@/lib/admin-messages";

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const redirectingRef = useRef(false);

  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const nextPath = searchParams?.get("next") || "/admin";
  const blocked = searchParams?.get("blocked") === "1";

  useEffect(() => {
    if (blocked) {
      setError("هذا الحساب غير مصرح له بدخول لوحة الأدمن.");
    }
  }, [blocked]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    let mounted = true;

    async function syncUserState() {
      const {
        data: { session },
      } = await client.auth.getSession();

      if (!mounted || !session?.user?.email || redirectingRef.current) {
        return;
      }

      setEmail((currentEmail) => currentEmail || session.user.email || "");
      redirectingRef.current = true;
      window.location.assign(nextPath);
    }

    void syncUserState();

    return () => {
      mounted = false;
    };
  }, [nextPath, supabase]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    if (!supabase || redirectingRef.current) {
      if (!supabase) {
        setError("اتصال قاعدة البيانات غير مفعّل بعد. راجع إعدادات الربط ثم أعد تشغيل الموقع.");
      }
      return;
    }

    setLoading(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(formatAdminError(signInError, "تعذر تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى."));
      setLoading(false);
      return;
    }

    redirectingRef.current = true;
    window.location.assign(nextPath);
  }

  return (
    <main className="admin-auth-page" dir="rtl">
      <div className="admin-auth-card">
        <div className="admin-auth-card__head">
          <span className="luxury-kicker">Flora Style Admin</span>
          <h1>تسجيل دخول الأدمن</h1>
          <p>ادخل إلى لوحة التحكم باستخدام بيانات الأدمن المعتمدة.</p>
        </div>

        {!isSupabaseEnabled() ? (
          <div className="admin-auth-message is-error">
            اتصال قاعدة البيانات غير مفعّل بعد. راجع إعدادات الربط في السيرفر ثم أعد تشغيل الموقع.
          </div>
        ) : null}

        {error ? <div className="admin-auth-message is-error">{error}</div> : null}

        <form className="admin-auth-form" onSubmit={handleLogin}>
          <label className="form-row">
            <span>البريد الإلكتروني</span>
            <div className="admin-auth-input">
              <Mail size={16} />
              <input
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
              <input onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
            </div>
          </label>

          <button className="button" disabled={loading || !isSupabaseEnabled()} type="submit">
            {loading ? "جاري الدخول..." : "دخول"}
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
