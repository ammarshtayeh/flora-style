"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { getOneSignalAppId, isOneSignalConfigured } from "@/lib/onesignal";

export function OneSignalInit() {
  const appId = getOneSignalAppId();
  const initialized = useRef(false);

  useEffect(() => {
    if (!isOneSignalConfigured() || initialized.current) return;
    initialized.current = true;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      await OneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: process.env.NODE_ENV === "development",
        notifyButton: { enable: false },
        serviceWorkerPath: "/OneSignalSDKWorker.js",
      });
    });
  }, [appId]);

  if (!isOneSignalConfigured()) return null;

  return (
    <Script
      id="onesignal-sdk"
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      strategy="afterInteractive"
    />
  );
}
