"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Mail } from "lucide-react";
import { isAllowedAdminEmail } from "@/lib/admin-access";
import { createBrowserSupabaseClient, isSupabaseEnabled } from "@/lib/supabase/client";

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        data: { user },
      } = await client.auth.getUser();

      if (!mounted) {
        return;
      }

      if (user?.email) {
        setEmail((currentEmail) => currentEmail || user.email || "");
        if (isAllowedAdminEmail(user.email)) {
          router.replace(nextPath);
          router.refresh();
        }
      }
    }

    void syncUserState();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setEmail((currentEmail) => currentEmail || session.user.email || "");
        if (isAllowedAdminEmail(session.user.email)) {
          router.replace(nextPath);
          router.refresh();
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      setError("Supabase غير مفعّل بعد. تحقق من متغيرات البيئة.");
      return;
    }

    setLoading(true);
    setError("");

    if (!isAllowedAdminEmail(email)) {
      setError("هذا البريد الإلكتروني غير مصرح له بدخول الأدمن.");
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message === "Email not confirmed" ? "الحساب غير مفعّل بعد." : signInError.message);
      setLoading(false);
      return;
    }

    router.replace(nextPath);
    router.refresh();
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
            Supabase غير مفعّل بعد. أضف المتغيرات في <code>.env.local</code> وأعد تشغيل المشروع.
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
            {loading ? "جاري المعالجة..." : "دخول"}
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
