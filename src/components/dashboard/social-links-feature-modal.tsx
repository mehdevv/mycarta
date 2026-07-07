import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Facebook, Globe, Instagram, MessageCircle, Share2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  hasSeenSocialLinksFeature,
  markSocialLinksFeatureSeen,
} from "@/lib/feature-announcements";
import { useLocale } from "@/lib/i18n/locale-context";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.53 6.34 6.34 0 0 0 9.49 22a6.34 6.34 0 0 0 6.34-6.34V9.11a8.16 8.16 0 0 0 4.76 1.52V7.18a4.85 4.85 0 0 1-1-.49z" />
    </svg>
  );
}

function FeaturePreviewIllustration() {
  const fields = [
    { icon: Instagram, label: "Instagram", value: "@cafe_alger" },
    { icon: Facebook, label: "Facebook", value: "facebook.com/cafe" },
    { icon: TikTokIcon, label: "TikTok", value: "@cafe_alger" },
    { icon: MessageCircle, label: "WhatsApp", value: "0555 123 456" },
    { icon: Globe, label: "Site web", value: "www.cafe.dz" },
  ] as const;

  return (
    <div className="dash-feature-social-preview" aria-hidden>
      <div className="dash-feature-social-preview-editor">
        <p className="dash-feature-social-preview-label">Réseaux sociaux</p>
        <div className="dash-feature-social-preview-fields">
          {fields.map(({ icon: Icon, label, value }) => (
            <div key={label} className="dash-feature-social-preview-field">
              <span className="dash-feature-social-preview-field-label">
                <Icon className="h-3 w-3" />
                {label}
              </span>
              <span className="dash-feature-social-preview-field-input">{value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="dash-feature-social-preview-phone">
        <div className="dash-feature-social-preview-card">
          <div className="dash-feature-social-preview-card-top" />
          <div className="dash-feature-social-preview-qr" />
        </div>
        <div className="dash-feature-social-preview-socials">
          <span>Suivez-nous</span>
          <div className="dash-feature-social-preview-social-row">
            <Instagram className="h-3.5 w-3.5" />
            <Facebook className="h-3.5 w-3.5" />
            <TikTokIcon className="h-3.5 w-3.5" />
            <MessageCircle className="h-3.5 w-3.5" />
            <Globe className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}

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
      <DialogContent className="dash-feature-social-modal sm:max-w-lg">
        <DialogHeader className="text-left space-y-3">
          <span className="dash-feature-social-badge">
            <Sparkles className="h-3.5 w-3.5" />
            {t("dashboard.features.socialLinks.badge")}
          </span>
          <DialogTitle className="text-xl leading-snug pr-6">
            {t("dashboard.features.socialLinks.title")}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {t("dashboard.features.socialLinks.description")}
          </DialogDescription>
        </DialogHeader>

        <FeaturePreviewIllustration />

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

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-1">
          <button type="button" className="dash-btn-secondary" onClick={dismiss}>
            {t("dashboard.features.socialLinks.later")}
          </button>
          <Link href="/dashboard/ccard" className="dash-btn-primary text-center" onClick={dismiss}>
            {t("dashboard.features.socialLinks.cta")}
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
