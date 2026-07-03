import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLATFORM } from "@/lib/platform";
import { SITE_URL } from "@/lib/seo";
import {
  dismissCartaWatermark,
  useCartaWatermarkDismissed,
} from "@/lib/carta-watermark-storage";

type CartaCardWatermarkProps = {
  /** `viewport` = fixed bottom bar on client card page; `card` = floats on card edge in previews */
  placement?: "card" | "viewport";
  tenantSlug?: string;
};

export default function CartaCardWatermark({
  placement = "card",
  tenantSlug,
}: CartaCardWatermarkProps) {
  const persistDismiss = placement === "viewport";
  const persistedDismissed = useCartaWatermarkDismissed(persistDismiss ? tenantSlug : undefined);
  const [sessionDismissed, setSessionDismissed] = useState(false);
  const dismissed = persistedDismissed || sessionDismissed;

  if (dismissed) return null;

  const handleDismiss = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (persistDismiss) {
      dismissCartaWatermark(tenantSlug);
    } else {
      setSessionDismissed(true);
    }
  };

  return (
    <div className={cn("card-tpl-watermark", `card-tpl-watermark--${placement}`)}>
      <a
        href={SITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="card-tpl-watermark-link"
        aria-label={`Découvrir ${PLATFORM.name} — cartes fidélité digitales`}
      >
        <img src="/logo.png" alt="" width={28} height={28} className="card-tpl-watermark-logo" />
        <span className="card-tpl-watermark-text">
          Propulsé par <strong>{PLATFORM.name}</strong>
        </span>
      </a>
      <button
        type="button"
        className="card-tpl-watermark-close"
        onClick={handleDismiss}
        aria-label="Masquer"
      >
        <X size={16} strokeWidth={2.25} />
      </button>
    </div>
  );
}

export { useCartaWatermarkDismissed } from "@/lib/carta-watermark-storage";
