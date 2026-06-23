"use client";

import { Bell, Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isOneSignalConfigured, requestFloraPushPermission } from "@/lib/onesignal";
import type { Language } from "@/lib/store";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isMobileDevice() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(max-width: 900px)").matches ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  );
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
}

export function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [language, setLanguage] = useState<Language>("ar");
  const [readyToShow, setReadyToShow] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [notifyDismissed, setNotifyDismissed] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedNotifyDismiss = window.localStorage.getItem("flora-notify-dismissed");
    if (savedNotifyDismiss === "1") setNotifyDismissed(true);
    if (window.localStorage.getItem("flora-push-enabled") === "1") setPushEnabled(true);

    const savedDismiss = window.localStorage.getItem("flora-install-dismissed");
    if (savedDismiss === "1") setDismissed(true);

    const savedLanguage = window.localStorage.getItem("flora-language") as Language;
    if (savedLanguage === "ar" || savedLanguage === "he") setLanguage(savedLanguage);

    setIsMobile(isMobileDevice());
    setInstalled(isStandaloneMode());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleLanguageChange = (event: Event) => {
      setLanguage((event as CustomEvent<Language>).detail);
    };

    const handleDisplayModeChange = () => {
      setInstalled(isStandaloneMode());
    };

    const revealTimer = window.setTimeout(() => setReadyToShow(true), 500);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("flora-language-changed", handleLanguageChange);
    window.matchMedia("(display-mode: standalone)").addEventListener("change", handleDisplayModeChange);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/OneSignalSDKWorker.js").catch(() => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          // PWA support should never block the shopping experience.
        });
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("flora-language-changed", handleLanguageChange);
      window.matchMedia("(display-mode: standalone)").removeEventListener("change", handleDisplayModeChange);
      window.clearTimeout(revealTimer);
    };
  }, []);

  async function handleInstall() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallPrompt(null);
        setDismissed(true);
        window.localStorage.setItem("flora-install-dismissed", "1");
      }
      return;
    }

    setShowInstallGuide(true);
  }

  async function handleEnableNotifications() {
    const granted = await requestFloraPushPermission();
    if (granted) {
      window.localStorage.setItem("flora-push-enabled", "1");
      setPushEnabled(true);
      setNotifyDismissed(true);
    }
  }

  function handleDismissNotify() {
    setNotifyDismissed(true);
    window.localStorage.setItem("flora-notify-dismissed", "1");
  }

  function handleDismiss() {
    setDismissed(true);
    window.localStorage.setItem("flora-install-dismissed", "1");
  }

  const isAdmin = pathname?.startsWith("/admin");
  const isIos = isIosDevice();
  const shouldShowInstallPrompt = isMobile && !installed && !dismissed && readyToShow && !isAdmin;
  const canOfferNotifications = isOneSignalConfigured() && (!isIos || installed);
  const shouldShowNotifyPrompt =
    isMobile &&
    canOfferNotifications &&
    !pushEnabled &&
    !notifyDismissed &&
    readyToShow &&
    !isAdmin &&
    (!shouldShowInstallPrompt || !isIos);

  const copy =
    language === "ar"
      ? {
          title: "ثبّتي Flora Style",
          body: "احفظي المتجر على جهازك لتجربة أسرع وأقرب لتطبيق فعلي.",
          later: "لاحقاً",
          install: "تثبيت",
          notifications: "تفعيل الإشعارات",
          guideTitle: isIosDevice() ? "إضافة إلى الشاشة الرئيسية" : "تثبيت التطبيق",
          guideClose: "حسناً",
          iosSteps: [
            "اضغطي على زر المشاركة في أسفل المتصفح.",
            'اخترى "إضافة إلى الشاشة الرئيسية".',
            'اضغطي "إضافة" لحفظ Flora Style على جهازك.',
          ],
          androidSteps: [
            "اضغطي على قائمة المتصفح (⋮).",
            'اخترى "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية".',
            "أكّدي التثبيت لحفظ Flora Style على جهازك.",
          ],
        }
      : {
          title: "התקיני Flora Style",
          body: "שמרי את החנות על המכשיר לחוויה מהירה וקרובה יותר לאפליקציה.",
          later: "אחר כך",
          install: "התקנה",
          notifications: "הפעלת התראות",
          guideTitle: isIosDevice() ? "הוספה למסך הבית" : "התקנת האפליקציה",
          guideClose: "הבנתי",
          iosSteps: [
            "לחצי על כפתור השיתוף בתחתית הדפדפן.",
            'בחרי "הוסף למסך הבית".',
            'לחצי "הוסף" כדי לשמור את Flora Style במכשיר.',
          ],
          androidSteps: [
            "לחצי על תפריט הדפדפן (⋮).",
            'בחרי "התקן אפליקציה" או "הוסף למסך הבית".',
            "אשרי את ההתקנה כדי לשמור את Flora Style במכשיר.",
          ],
        };

  return (
    <>
      {shouldShowInstallPrompt ? (
        <div className="install-prompt" role="dialog" aria-live="polite">
          <div>
            <span>{copy.title}</span>
            <p>{copy.body}</p>
          </div>
          <div className="install-prompt__actions">
            <button onClick={handleDismiss} type="button">
              {copy.later}
            </button>
            {canOfferNotifications && !isIos ? (
              <button className="install-prompt__notify" onClick={handleEnableNotifications} type="button">
                <Bell size={16} />
                {copy.notifications}
              </button>
            ) : null}
            <button onClick={handleInstall} type="button">
              <Download size={16} />
              {copy.install}
            </button>
          </div>
        </div>
      ) : null}

      {shouldShowNotifyPrompt ? (
        <div className="install-prompt install-prompt--notify-only" role="dialog" aria-live="polite">
          <div>
            <span>{language === "ar" ? "فعّلي إشعارات Flora Style" : "הפעילי התראות Flora Style"}</span>
            <p>
              {language === "ar"
                ? "احصلي على تنبيهات العروض والمنتجات الجديدة مباشرة على جوالك."
                : "קבלי עדכונים על מבצעים ומוצרים חדשים ישירות לנייד."}
            </p>
          </div>
          <div className="install-prompt__actions">
            <button onClick={handleDismissNotify} type="button">
              {copy.later}
            </button>
            <button onClick={handleEnableNotifications} type="button">
              <Bell size={16} />
              {copy.notifications}
            </button>
          </div>
        </div>
      ) : null}

      {showInstallGuide ? (
        <div className="install-guide" onClick={() => setShowInstallGuide(false)} role="presentation">
          <div
            className="install-guide__sheet"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              aria-label={copy.guideClose}
              className="install-guide__close"
              onClick={() => setShowInstallGuide(false)}
              type="button"
            >
              <X size={18} />
            </button>
            <div className="install-guide__icon">
              <Share size={22} />
            </div>
            <h3>{copy.guideTitle}</h3>
            <ol>
              {(isIosDevice() ? copy.iosSteps : copy.androidSteps).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <button className="button install-guide__confirm" onClick={() => setShowInstallGuide(false)} type="button">
              {copy.guideClose}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
