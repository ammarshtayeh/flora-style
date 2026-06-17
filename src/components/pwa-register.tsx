"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { Language } from "@/lib/store";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [language, setLanguage] = useState<Language>("ar");
  const [readyToShow, setReadyToShow] = useState(false);
  const pathname = usePathname();

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

    const isHome = pathname === "/";
    const revealPrompt = () => setReadyToShow(true);
    const revealOnScroll = () => {
      const threshold = isHome ? window.innerHeight * 0.72 : 260;
      if (window.scrollY > threshold) {
        setReadyToShow(true);
        window.removeEventListener("scroll", revealOnScroll);
      }
    };

    const timer = window.setTimeout(() => {
      if (!isHome) revealPrompt();
    }, isHome ? 9000 : 4500);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("flora-language-changed", handleLanguageChange);
    window.addEventListener("scroll", revealOnScroll, { passive: true });

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // PWA support should never block the shopping experience.
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("flora-language-changed", handleLanguageChange);
      window.removeEventListener("scroll", revealOnScroll);
      window.clearTimeout(timer);
    };
  }, [pathname]);

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

  return installPrompt && !dismissed && readyToShow && pathname === "/" && !pathname?.startsWith("/admin") ? (
    <div className="install-prompt">
      <div>
        <span>{language === "ar" ? "ثبّتي Flora Style" : "התקיני Flora Style"}</span>
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
