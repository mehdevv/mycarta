import type { ImageSettings } from "qrcode.react";

export function getQrLogoSettings(
  logoUrl: string | null | undefined,
  qrSize: number,
): ImageSettings | undefined {
  if (!logoUrl) return undefined;

  const logoSize = Math.round(qrSize * 0.22);
  const isRemote = logoUrl.startsWith("http");

  return {
    src: logoUrl,
    height: logoSize,
    width: logoSize,
    excavate: true,
    ...(isRemote ? { crossOrigin: "anonymous" as const } : {}),
  };
}

export function downloadQrCanvas(canvas: HTMLCanvasElement, filename: string) {
  const url = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
}
