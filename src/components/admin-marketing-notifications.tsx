"use client";

import { Bell, Send } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { OneSignalDiagnostics } from "@/lib/onesignal-server";
import {
  marketingNotificationTemplates,
  type MarketingNotificationAudience,
  type MarketingNotificationDraft,
} from "@/lib/marketing-notifications";
import { formatAdminError } from "@/lib/admin-messages";
import { AdminHint } from "@/components/admin-alerts";

const blankDraft = (): MarketingNotificationDraft => ({
  titleAr: "",
  titleHe: "",
  bodyAr: "",
  bodyHe: "",
  url: "/shop",
  audience: "all",
});

export function AdminMarketingNotifications({
  onMessage,
  onError,
}: {
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [draft, setDraft] = useState<MarketingNotificationDraft>(blankDraft);
  const [isSending, setIsSending] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<OneSignalDiagnostics | null>(null);

  useEffect(() => {
    fetch("/api/admin/notifications", { credentials: "include" })
      .then((response) => response.json())
      .then((payload: { diagnostics?: OneSignalDiagnostics }) => {
        if (payload.diagnostics) setDiagnostics(payload.diagnostics);
      })
      .catch(() => setDiagnostics(null));
  }, []);

  const audienceLabel = useMemo(() => {
    return draft.audience === "cart" ? "مشتركون لديهم منتجات في السلة" : "كل المشتركين المفعّلين";
  }, [draft.audience]);

  function applyTemplate(templateId: string) {
    const template = marketingNotificationTemplates.find((entry) => entry.id === templateId);
    if (!template) return;
    setActiveTemplateId(templateId);
    setDraft({ ...template.draft, templateId });
    onError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onError("");
    onMessage("");
    setIsSending(true);

    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(payload.error || "تعذر إرسال الإشعار.");
      }

      onMessage(payload.message || "تم إرسال الإشعار بنجاح.");
    } catch (error) {
      onError(formatAdminError(error, "تعذر إرسال الإشعار."));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="admin-marketing">
      <div className="admin-panel admin-marketing__intro">
        <div className="admin-marketing__intro-head">
          <div className="admin-marketing__icon" aria-hidden>
            <Bell size={22} />
          </div>
          <div>
            <p className="eyebrow">Marketing → Notifications</p>
            <h2>إرسال إشعارات Push</h2>
            <p className="muted">
              أرسل إشعارات للزبائن المشتركين في OneSignal. تذكير السلة يصل فقط لمن لديه منتجات في السلة ومفعّل الإشعارات.
            </p>
          </div>
        </div>
        {diagnostics?.issue ? (
          <AdminHint variant="warning">{diagnostics.issue}</AdminHint>
        ) : diagnostics?.apiReachable ? (
          <AdminHint variant="success">
            OneSignal متصل — المشتركين المكتشفين عبر API: <strong>{diagnostics.subscriptionCount}</strong>
          </AdminHint>
        ) : null}
      </div>

      <div className="admin-panel">
        <h3>قوالب سريعة</h3>
        <div className="admin-marketing__templates">
          {marketingNotificationTemplates.map((template) => (
            <button
              className={activeTemplateId === template.id ? "is-active" : undefined}
              key={template.id}
              onClick={() => applyTemplate(template.id)}
              type="button"
            >
              <strong>{template.labelAr}</strong>
              <span>{template.descriptionAr}</span>
            </button>
          ))}
        </div>
      </div>

      <form className="admin-panel form-grid admin-marketing__form" onSubmit={handleSubmit}>
        <label className="form-row">
          <span>عنوان الإشعار (عربي)</span>
          <input
            className="field"
            onChange={(event) => setDraft((current) => ({ ...current, titleAr: event.target.value }))}
            placeholder="مثال: وصل حديثًا إلى Flora Style"
            required
            value={draft.titleAr}
          />
        </label>

        <label className="form-row">
          <span>عنوان الإشعار (عبري)</span>
          <input
            className="field"
            onChange={(event) => setDraft((current) => ({ ...current, titleHe: event.target.value }))}
            placeholder="לדוגמה: חדש ב-Flora Style"
            value={draft.titleHe}
          />
        </label>

        <Textarea
          label="نص الإشعار (عربي)"
          onChange={(value) => setDraft((current) => ({ ...current, bodyAr: value }))}
          required
          value={draft.bodyAr}
        />

        <Textarea
          label="نص الإشعار (عبري)"
          onChange={(value) => setDraft((current) => ({ ...current, bodyHe: value }))}
          value={draft.bodyHe}
        />

        <label className="form-row">
          <span>رابط عند الضغط على الإشعار</span>
          <input
            className="field"
            onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
            placeholder="/shop أو https://flora-style.shop/shop"
            value={draft.url}
          />
        </label>

        <label className="form-row">
          <span>الجمهور</span>
          <select
            className="field"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                audience: event.target.value as MarketingNotificationAudience,
              }))
            }
            value={draft.audience}
          >
            <option value="all">كل المشتركين المفعّلين</option>
            <option value="cart">من لديهم منتجات في السلة فقط</option>
          </select>
        </label>

        <AdminHint variant="info">
          سيتم الإرسال إلى: <strong>{audienceLabel}</strong>
        </AdminHint>

        <button className="button admin-marketing__send" disabled={isSending} type="submit">
          <Send size={16} />
          {isSending ? "جاري الإرسال..." : "إرسال الإشعار"}
        </button>
      </form>
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="form-row">
      <span>{label}</span>
      <textarea
        className="field"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        rows={4}
        value={value}
      />
    </label>
  );
}
