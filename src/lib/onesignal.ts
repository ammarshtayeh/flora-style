export function getOneSignalAppId() {
  return process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim() ?? "";
}

export function isOneSignalConfigured() {
  return Boolean(getOneSignalAppId());
}

type OneSignalSdk = {
  init: (options: Record<string, unknown>) => Promise<void>;
  Notifications: {
    permission: boolean;
    requestPermission: () => Promise<void>;
  };
  User: {
    addTags: (tags: Record<string, string>) => Promise<void>;
  };
};

type OneSignalDeferred = Array<(oneSignal: OneSignalSdk) => void | Promise<void>>;

declare global {
  interface Window {
    OneSignalDeferred?: OneSignalDeferred;
  }
}

export function whenOneSignalReady(callback: (oneSignal: OneSignalSdk) => void | Promise<void>) {
  if (typeof window === "undefined" || !isOneSignalConfigured()) return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(callback);
}

export async function requestFloraPushPermission() {
  if (!isOneSignalConfigured()) return false;

  return new Promise<boolean>((resolve) => {
    whenOneSignalReady(async (OneSignal) => {
      try {
        if (OneSignal.Notifications.permission) {
          resolve(true);
          return;
        }

        await OneSignal.Notifications.requestPermission();
        resolve(OneSignal.Notifications.permission);
      } catch {
        resolve(false);
      }
    });
  });
}

export function syncOneSignalCartTag(hasCart: boolean) {
  if (!isOneSignalConfigured()) return;

  whenOneSignalReady(async (OneSignal) => {
    try {
      await OneSignal.User.addTags({ has_cart: hasCart ? "true" : "false" });
    } catch {
      // Tag sync should never block checkout or cart updates.
    }
  });
}
