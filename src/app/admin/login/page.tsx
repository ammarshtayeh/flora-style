"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Lock, Mail, UserPlus } from "lucide-react";
import { createBrowserSupabaseClient, isSupabaseEnabled } from "@/lib/supabase/client";

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "bootstrap">("login");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const nextPath = searchParams?.get("next") || "/admin";
  const blocked = searchParams?.get("blocked") === "1";

  useEffect(() => {
    if (blocked) {
      setError("هذا الحساب غير مضاف كأدمن بعد. يمكنك إنشاء أول أدمن أو استخدام حساب أدمن فعّال.");
    }
  }, [blocked]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      setError("Supabase غير مفعّل بعد. تحقق من متغيرات البيئة.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  async function handleBootstrap(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      setError("Supabase غير مفعّل بعد. تحقق من متغيرات البيئة.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    const userEmail = data.user?.email ?? email;

    if (!userId) {
      setMessage("تم إنشاء الحساب. أكّد البريد الإلكتروني إن كان التحقق مفعلاً، ثم سجّل الدخول.");
      setLoading(false);
      return;
    }

    const { error: adminError } = await supabase.from("admins").insert({
      user_id: userId,
      email: userEmail,
      display_name: "Primary Admin",
    });

    if (adminError) {
      setError(adminError.message);
      setLoading(false);
      return;
    }

    setMessage("تم إنشاء أول أدمن بنجاح. يمكنك الآن الدخول للوحة التحكم.");
    setMode("login");
    setLoading(false);
  }

  return (
    <main className="admin-auth-page" dir="rtl">
      <div className="admin-auth-card">
        <div className="admin-auth-card__head">
          <span className="luxury-kicker">Flora Style Admin</span>
          <h1>تسجيل دخول الأدمن</h1>
          <p>
            لوحة التحكم محمية عبر Supabase Auth. استخدم حساب الأدمن، أو أنشئ أول أدمن إذا كانت هذه أول
            مرة.
          </p>
        </div>

        {!isSupabaseEnabled() ? (
          <div className="admin-auth-message is-error">
            Supabase غير مفعّل بعد. أضف المتغيرات في <code>.env.local</code> وأعد تشغيل المشروع.
          </div>
        ) : null}

        {message ? <div className="admin-auth-message is-success">{message}</div> : null}
        {error ? <div className="admin-auth-message is-error">{error}</div> : null}

        <div className="admin-auth-tabs">
          <button className={mode === "login" ? "is-active" : ""} onClick={() => setMode("login")} type="button">
            <Lock size={16} />
            دخول الأدمن
          </button>
          <button className={mode === "bootstrap" ? "is-active" : ""} onClick={() => setMode("bootstrap")} type="button">
            <UserPlus size={16} />
            إنشاء أول أدمن
          </button>
        </div>

        <form className="admin-auth-form" onSubmit={mode === "login" ? handleLogin : handleBootstrap}>
          <label className="form-row">
            <span>البريد الإلكتروني</span>
            <div className="admin-auth-input">
              <Mail size={16} />
              <input onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
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
            {loading ? "جاري المعالجة..." : mode === "login" ? "دخول" : "إنشاء أول أدمن"}
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
