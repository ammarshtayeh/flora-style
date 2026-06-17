import { initialStoreData, StoreData } from "./store";

const storageKey = "flora-style-admin-data";

function normalizeStoreData(data: StoreData): StoreData {
  return {
    ...data,
    colors: data.colors.map((color) =>
      color.id === "color-pink"
        ? {
            ...color,
            nameAr: "موكا",
            nameHe: "מוקה",
            value: "#A78D78"
          }
        : color
    )
  };
}

export function loadStoreData(): StoreData {
  if (typeof window === "undefined") return initialStoreData;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    // Initialize with demo data if empty
    const seeded = normalizeStoreData(initialStoreData);
    window.localStorage.setItem(storageKey, JSON.stringify(seeded));
    return seeded;
  }
  try {
    return normalizeStoreData(JSON.parse(raw) as StoreData);
  } catch {
    return normalizeStoreData(initialStoreData);
  }
}

export function saveStoreData(data: StoreData, options?: { notify?: boolean }): void {
  if (typeof window === "undefined") return;
  const nextData = normalizeStoreData(data);
  window.localStorage.setItem(storageKey, JSON.stringify(nextData));
  // Dispatch event for other components to know data changed
  if (options?.notify !== false) {
    window.dispatchEvent(new CustomEvent("flora-data-updated", { detail: nextData }));
  }
}

export function subscribeToStoreData(callback: (data: StoreData) => void) {
  if (typeof window === "undefined") return () => {};

  const handleUpdate = (event?: Event) => {
    if (event instanceof CustomEvent && event.type === "flora-data-updated") {
      callback(normalizeStoreData(event.detail as StoreData));
      return;
    }
    callback(loadStoreData());
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey) {
      handleUpdate();
    }
  };

  window.addEventListener("flora-data-updated", handleUpdate);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener("flora-data-updated", handleUpdate);
    window.removeEventListener("storage", handleStorage);
  };
}
