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
  const [hasSession, setHasSession] = useState(false);

  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const nextPath = searchParams?.get("next") || "/admin";
  const blocked = searchParams?.get("blocked") === "1";

  useEffect(() => {
    if (blocked) {
      setError("هذا الحساب غير مضاف كأدمن بعد. إذا لم يتم إنشاء أي أدمن بعد، افتح تبويب إنشاء أول أدمن لإكمال الربط بهذا الحساب.");
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

      setHasSession(!!user);
      if (user?.email) {
        setEmail((currentEmail) => currentEmail || user.email || "");
      }
    }

    void syncUserState();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session?.user);
      if (session?.user?.email) {
        setEmail((currentEmail) => currentEmail || session.user.email || "");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function bootstrapCurrentUser() {
    if (!supabase) {
      throw new Error("Supabase غير مفعّل بعد. تحقق من متغيرات البيئة.");
    }

    const { error: bootstrapError } = await supabase.rpc("bootstrap_admin_account", {
      p_display_name: "Primary Admin",
    });

    if (bootstrapError) {
      throw bootstrapError;
    }
  }

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

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (currentUser) {
      try {
        await bootstrapCurrentUser();
        router.replace(nextPath);
        router.refresh();
        return;
      } catch (bootstrapError) {
        setError(bootstrapError instanceof Error ? bootstrapError.message : "تعذر إكمال ربط أول أدمن.");
        setLoading(false);
        return;
      }
    }

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setMessage("تم إنشاء الحساب. أكّد البريد الإلكتروني إن كان التحقق مفعلاً، ثم سجّل الدخول للمتابعة.");
      setLoading(false);
      return;
    }

    if (!data.session) {
      setMessage(
        'تم إنشاء الحساب. إذا كان تأكيد البريد الإلكتروني مفعلاً في Supabase، أكّد البريد ثم سجّل الدخول بهذا الحساب وارجع إلى تبويب "إنشاء أول أدمن" لإكمال الربط.'
      );
      setLoading(false);
      return;
    }

    try {
      await bootstrapCurrentUser();
    } catch (bootstrapError) {
      setError(bootstrapError instanceof Error ? bootstrapError.message : "تعذر إكمال ربط أول أدمن.");
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
            إنشاء / إكمال أول أدمن
          </button>
        </div>

        {mode === "bootstrap" && hasSession ? (
          <div className="admin-auth-message">
            أنت مسجّل الدخول الآن. اضغط الزر لإكمال ربط هذا الحساب كأول أدمن إذا لم يوجد أدمن بعد.
          </div>
        ) : null}

        <form className="admin-auth-form" onSubmit={mode === "login" ? handleLogin : handleBootstrap}>
          <label className="form-row">
            <span>البريد الإلكتروني</span>
            <div className="admin-auth-input">
              <Mail size={16} />
              <input
                disabled={mode === "bootstrap" && hasSession}
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </div>
          </label>

          {mode === "bootstrap" && hasSession ? null : (
            <label className="form-row">
              <span>كلمة المرور</span>
              <div className="admin-auth-input">
                <ShieldCheck size={16} />
                <input onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
              </div>
            </label>
          )}

          <button className="button" disabled={loading || !isSupabaseEnabled()} type="submit">
            {loading ? "جاري المعالجة..." : mode === "login" ? "دخول" : hasSession ? "إكمال ربط أول أدمن" : "إنشاء أول أدمن"}
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
