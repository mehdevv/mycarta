import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Mail, MessageCircle, Plug, Save, Youtube } from "lucide-react";
import { useGetSettings } from "@/api";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import IntegrationVideoCard from "@/components/integrations/integration-video-card";
import {
  INTEGRATIONS_LOCKED,
  INTEGRATION_TUTORIALS,
} from "@/lib/integration-tutorials";
import { staggerContainer, staggerItem } from "@/lib/motion";

export default function IntegrationsPage() {
  const { data: settings, isLoading } = useGetSettings();
  const [whatsappToken, setWhatsappToken] = useState("");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState("");
  const [emailSender, setEmailSender] = useState("");

  useEffect(() => {
    if (settings) {
      setWhatsappToken(settings.whatsappToken ?? "");
      setWhatsappPhoneId(settings.whatsappPhoneId ?? "");
      setEmailSender(settings.emailSender ?? "");
    }
  }, [settings]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="dash-skeleton h-20 w-72" />
        <div className="dash-skeleton h-24 rounded-2xl" />
        <div className="dash-video-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="dash-skeleton h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-10">
      <DashboardPageHeader
        eyebrow="Connexions"
        title="Intégrations"
        description="Guides vidéo et configuration des API WhatsApp et email pour vos campagnes."
      />

      {INTEGRATIONS_LOCKED && (
        <motion.article className="dash-card dash-integrations-locked" variants={staggerItem}>
          <div className="dash-integrations-lock">
            <div className="dash-integrations-lock-icon">
              <Lock className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="dash-integrations-lock-title">Configuration API — bientôt disponible</p>
              <p className="dash-integrations-lock-desc">
                Les champs de connexion seront activés prochainement. En attendant, suivez les guides
                vidéo ci-dessous pour préparer vos comptes Meta et votre domaine email.
              </p>
            </div>
            <span className="dash-badge dash-badge--warning shrink-0">À venir</span>
          </div>
        </motion.article>
      )}

      <motion.section variants={staggerItem} className="space-y-4">
        <div className="dash-section-head !mb-2">
          <div>
            <h2 className="dash-section-title flex items-center gap-2">
              <Youtube size={20} className="text-[var(--dash-brand)]" />
              Guides vidéo
            </h2>
            <p className="dash-section-desc">
              Tutoriels pas à pas pour configurer WhatsApp Business et l&apos;email avant l&apos;activation.
            </p>
          </div>
        </div>

        <div className="dash-video-grid">
          {INTEGRATION_TUTORIALS.map((tutorial) => (
            <IntegrationVideoCard key={tutorial.id} tutorial={tutorial} />
          ))}
        </div>
      </motion.section>

      <motion.section variants={staggerItem} className="space-y-4">
        <div className="dash-section-head !mb-2">
          <div>
            <h2 className="dash-section-title flex items-center gap-2">
              <Plug size={20} className="text-[var(--dash-brand)]" />
              Configuration API
            </h2>
            <p className="dash-section-desc">
              Collez vos identifiants une fois les intégrations activées sur la plateforme.
            </p>
          </div>
        </div>

        <div
          className={
            INTEGRATIONS_LOCKED
              ? "dash-integrations-api-locked grid gap-4 lg:grid-cols-2"
              : "grid gap-4 lg:grid-cols-2"
          }
        >
          <article className="dash-card">
            <div className="dash-card-header flex items-center gap-3">
              <div className="dash-qr-hub-icon">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="dash-card-title">WhatsApp Business API</h3>
                <p className="dash-section-desc">Jeton Meta et ID du numéro professionnel.</p>
              </div>
            </div>
            <div className="dash-card-body pt-0 space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--dash-text)]">Jeton d&apos;accès</label>
                <input
                  type="password"
                  className="mt-1 w-full rounded-xl border border-[var(--dash-border)] px-3 py-2.5 text-sm bg-white disabled:opacity-60"
                  placeholder="Jeton API WhatsApp"
                  value={whatsappToken}
                  onChange={(e) => setWhatsappToken(e.target.value)}
                  disabled={INTEGRATIONS_LOCKED}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--dash-text)]">ID numéro de téléphone</label>
                <input
                  className="mt-1 w-full rounded-xl border border-[var(--dash-border)] px-3 py-2.5 text-sm bg-white disabled:opacity-60"
                  placeholder="ID depuis le tableau de bord Meta"
                  value={whatsappPhoneId}
                  onChange={(e) => setWhatsappPhoneId(e.target.value)}
                  disabled={INTEGRATIONS_LOCKED}
                />
              </div>
              <button
                type="button"
                className="dash-btn-primary sm:max-w-xs"
                disabled={INTEGRATIONS_LOCKED}
              >
                <Save className="h-4 w-4" />
                Enregistrer WhatsApp
              </button>
            </div>
          </article>

          <article className="dash-card">
            <div className="dash-card-header flex items-center gap-3">
              <div className="dash-qr-hub-icon">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="dash-card-title">Email expéditeur</h3>
                <p className="dash-section-desc">Adresse utilisée pour les campagnes clients.</p>
              </div>
            </div>
            <div className="dash-card-body pt-0 space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--dash-text)]">Adresse expéditeur</label>
                <input
                  type="email"
                  className="mt-1 w-full rounded-xl border border-[var(--dash-border)] px-3 py-2.5 text-sm bg-white disabled:opacity-60"
                  placeholder="no-reply@mycarta.dz"
                  value={emailSender}
                  onChange={(e) => setEmailSender(e.target.value)}
                  disabled={INTEGRATIONS_LOCKED}
                />
              </div>
              <button
                type="button"
                className="dash-btn-primary sm:max-w-xs"
                disabled={INTEGRATIONS_LOCKED}
              >
                <Save className="h-4 w-4" />
                Enregistrer Email
              </button>
            </div>
          </article>
        </div>
      </motion.section>
    </motion.div>
  );
}
