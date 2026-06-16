"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import type { Language } from "@/lib/store";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [language, setLanguage] = useState<Language>("ar");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedDismiss = window.localStorage.getItem("flora-install-dismissed");
    if (savedDismiss === "1") setDismissed(true);
    const savedLanguage = window.localStorage.getItem("flora-language") as Language;
    if (savedLanguage === "ar" || savedLanguage === "he") setLanguage(savedLanguage);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleLanguageChange = (event: Event) => {
      setLanguage((event as CustomEvent<Language>).detail);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("flora-language-changed", handleLanguageChange);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // PWA support should never block the shopping experience.
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("flora-language-changed", handleLanguageChange);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  }

  function handleDismiss() {
    setDismissed(true);
    window.localStorage.setItem("flora-install-dismissed", "1");
  }

  return installPrompt && !dismissed ? (
    <div className="install-prompt">
      <div>
        <span>Install Flora Style</span>
        <p>{language === "ar" ? "احفظي المتجر على جهازك لتجربة أسرع وأقرب لتطبيق فعلي." : "שמרי את החנות על המכשיר לחוויה מהירה וקרובה יותר לאפליקציה."}</p>
      </div>
      <div className="install-prompt__actions">
        <button onClick={handleDismiss} type="button">
          {language === "ar" ? "لاحقاً" : "אחר כך"}
        </button>
        <button onClick={handleInstall} type="button">
          <Download size={16} />
          {language === "ar" ? "تثبيت" : "התקנה"}
        </button>
      </div>
    </div>
  ) : null;
}
