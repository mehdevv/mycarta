/** TEMP: mobile debug console — remove this file + call in main.tsx when done. */
const ERUDA_CDN = "https://cdn.jsdelivr.net/npm/eruda@3.4.3/eruda.min.js";

function shouldEnableEruda() {
  if (typeof window === "undefined") return false;
  if (import.meta.env.DEV) return true;

  const params = new URLSearchParams(window.location.search);
  if (params.has("debug") || params.has("eruda")) return true;

  try {
    return localStorage.getItem("carta-eruda") === "1";
  } catch {
    return false;
  }
}

function loadErudaScript() {
  return new Promise<void>((resolve, reject) => {
    if ("eruda" in window) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = ERUDA_CDN;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Eruda"));
    document.body.appendChild(script);
  });
}

export async function initErudaDebug() {
  if (!shouldEnableEruda()) return;

  try {
    await loadErudaScript();
    const eruda = (window as Window & { eruda?: { init: () => void } }).eruda;
    eruda?.init();
  } catch {
    // Non-fatal — app should still run without the debug panel.
  }
}
