import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Instagram, Share2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  hasSeenSocialLinksFeature,
  markSocialLinksFeatureSeen,
} from "@/lib/feature-announcements";
import { useLocale } from "@/lib/i18n/locale-context";
import socialLinksFeaturePreview from "@/assets/social-links-feature-preview.png";

export default function SocialLinksFeatureModal() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (hasSeenSocialLinksFeature()) return;
    const timer = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = () => {
    markSocialLinksFeatureSeen();
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <DialogContent className="dash-feature-social-modal sm:max-w-md p-0 gap-0 overflow-hidden">
        <img
          src={socialLinksFeaturePreview}
          alt={t("dashboard.features.socialLinks.title")}
          className="dash-feature-social-preview-img w-full h-auto block"
          width={640}
          height={480}
        />

        <div className="px-5 pb-5 pt-4 space-y-4">
          <ul className="dash-feature-social-points">
            <li>
              <Share2 className="h-4 w-4 shrink-0" />
              {t("dashboard.features.socialLinks.point1")}
            </li>
            <li>
              <Instagram className="h-4 w-4 shrink-0" />
              {t("dashboard.features.socialLinks.point2")}
            </li>
          </ul>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="dash-btn-secondary" onClick={dismiss}>
              {t("dashboard.features.socialLinks.later")}
            </button>
            <Link href="/dashboard/ccard" className="dash-btn-primary text-center" onClick={dismiss}>
              {t("dashboard.features.socialLinks.cta")}
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
