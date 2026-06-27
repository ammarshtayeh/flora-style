"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, ShieldCheck, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

const DB_NOTICE_KEY = "flora-admin-db-notice-dismissed";

type AdminHintVariant = "info" | "success" | "warning";

const hintIcons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
} as const;

export function AdminHint({
  variant = "info",
  title,
  children,
}: {
  variant?: AdminHintVariant;
  title?: string;
  children: ReactNode;
}) {
  const Icon = hintIcons[variant];

  return (
    <div className={`admin-hint admin-hint--${variant}`} role="note">
      <div className={`admin-hint__icon admin-hint__icon--${variant}`}>
        <Icon size={16} strokeWidth={2.2} />
      </div>
      <div className="admin-hint__content">
        {title ? <strong>{title}</strong> : null}
        <p>{children}</p>
      </div>
    </div>
  );
}

type AdminAlertStackProps = {
  message: string;
  error: string;
  onClearMessage: () => void;
  onClearError: () => void;
};

function toastTitle(variant: "success" | "error", text: string) {
  if (variant === "error") {
    return "تعذّر تنفيذ العملية";
  }
  if (text.includes("حذف")) return "تم الحذف";
  if (text.includes("رفع") || text.includes("إضافة")) return "تم الرفع";
  if (text.includes("تحديث") || text.includes("تغيير")) return "تم التحديث";
  if (text.includes("تنزيل") || text.includes("نسخة")) return "تم التصدير";
  if (text.includes("نسخة من")) return "نسخ المنتج";
  if (text.includes("إنشاء")) return "تم الإنشاء";
  return "تم الحفظ بنجاح";
}

function AdminToast({
  variant,
  message,
  onDismiss,
}: {
  variant: "success" | "error";
  message: string;
  onDismiss: () => void;
}) {
  const Icon = variant === "success" ? CheckCircle2 : AlertCircle;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`admin-alert admin-alert--toast admin-alert--${variant}`}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      initial={{ opacity: 0, y: -16, scale: 0.98 }}
      role="status"
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={`admin-alert__icon admin-alert__icon--${variant}`}>
        <Icon size={20} strokeWidth={2.2} />
      </div>
      <div className="admin-alert__content">
        <strong>{toastTitle(variant, message)}</strong>
        <p>{message}</p>
      </div>
      <button aria-label="إغلاق" className="admin-alert__close" onClick={onDismiss} type="button">
        <X size={16} />
      </button>
      <span aria-hidden="true" className={`admin-alert__progress admin-alert__progress--${variant}`} />
    </motion.div>
  );
}

function DataProtectionNotice({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="admin-alert admin-alert--info"
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="admin-alert__icon admin-alert__icon--info">
        <ShieldCheck size={20} strokeWidth={2.2} />
      </div>
      <div className="admin-alert__content">
        <strong>حماية بيانات المتجر</strong>
        <p>بيانات المنتجات محفوظة في قاعدة البيانات. الحذف الجماعي للكتالوج معطّل لحماية عملك.</p>
      </div>
      <button aria-label="إخفاء" className="admin-alert__close" onClick={onDismiss} type="button">
        <X size={16} />
      </button>
    </motion.div>
  );
}

export function AdminAlertStack({ message, error, onClearMessage, onClearError }: AdminAlertStackProps) {
  const [showDbNotice, setShowDbNotice] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShowDbNotice(window.localStorage.getItem(DB_NOTICE_KEY) !== "1");
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onClearMessage, 5200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset timer when message text changes
  }, [message]);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(onClearError, 8000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset timer when error text changes
  }, [error]);

  function dismissDbNotice() {
    setShowDbNotice(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DB_NOTICE_KEY, "1");
    }
  }

  return (
    <div className="admin-alert-stack">
      {showDbNotice ? <DataProtectionNotice onDismiss={dismissDbNotice} /> : null}

      <div aria-live="polite" className="admin-alert-toasts">
        <AnimatePresence mode="popLayout">
          {message ? <AdminToast key="success" message={message} onDismiss={onClearMessage} variant="success" /> : null}
          {error ? <AdminToast key="error" message={error} onDismiss={onClearError} variant="error" /> : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
