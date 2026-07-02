import { QRCodeSVG } from "qrcode.react";
import { getQrLogoSettings } from "@/lib/branded-qr";
import { resolveBusinessLogo } from "@/hooks/use-branding";
import { PLATFORM } from "@/lib/platform";

export function BrandedQrCode({
  value,
  size = 200,
  logoUrl,
}: {
  value: string;
  size?: number;
  logoUrl?: string | null;
}) {
  const logo = resolveBusinessLogo(logoUrl) ?? PLATFORM.logoUrl;
  const imageSettings = getQrLogoSettings(logo, size);

  return (
    <QRCodeSVG
      value={value}
      size={size}
      level="H"
      marginSize={1}
      imageSettings={imageSettings}
    />
  );
}
