import { useSyncExternalStore } from "react";

const DISMISS_PREFIX = "carta-watermark-dismissed";
const DISMISS_EVENT = "carta-watermark-dismiss";

function dismissKey(slug?: string) {
  const id = slug?.trim() || "default";
  return `${DISMISS_PREFIX}:${id}`;
}

function readDismissed(slug?: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(dismissKey(slug)) === "1";
  } catch {
    return false;
  }
}

function subscribe(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key.startsWith(DISMISS_PREFIX)) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(DISMISS_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(DISMISS_EVENT, onStoreChange);
  };
}

export function dismissCartaWatermark(slug?: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(dismissKey(slug), "1");
    window.dispatchEvent(new Event(DISMISS_EVENT));
  } catch {
    // Private browsing or blocked storage — dismiss for this session only.
  }
}

export function useCartaWatermarkDismissed(slug?: string) {
  return useSyncExternalStore(
    subscribe,
    () => readDismissed(slug),
    () => false,
  );
}

/** @deprecated Use useCartaWatermarkDismissed */
export function isCartaWatermarkDismissed(slug?: string): boolean {
  return readDismissed(slug);
}
