import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  useAffiliatePricing,
  useCreateChargilyCheckout,
  useGetPlatformBankDetails,
  useGetPlanUsage,
  useGetTenantBillingDetails,
  useGetTenantPaymentReceipts,
  useGetTenantSubscriptions,
  useGetTrialStatus,
  useSubmitPaymentReceipt,
  useUpdateTenantBillingDetails,
  getTenantQueryKey,
} from "@/api/tenant";
import { useAuth } from "@/lib/auth";
import { PLANS, ANNUAL_BILLING_NOTE, formatDzd, type PlanId } from "@/lib/pricing";
import { PLATFORM } from "@/lib/platform";
import { useCurrentTenant } from "@/lib/tenant-context";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  Building2,
  Calendar,
  Check,
  CreditCard,
  History,
  Loader2,
  Mail,
  Receipt,
  Smartphone,
  Sparkles,
  Upload,
  ArrowUpRight,
  User,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { PlanLimitsCard } from "@/components/billing/plan-limits-card";
import { Input } from "@/components/ui/input";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

function hasBillingDetails(details: {
  billingFullName: string | null;
  billingPhone: string | null;
  billingEmail: string | null;
} | null | undefined) {
  return Boolean(
    details?.billingFullName?.trim() &&
      details?.billingPhone?.trim() &&
      details?.billingEmail?.trim(),
  );
}

const statusLabels: Record<string, string> = {
  trialing: "Essai gratuit",
  active: "Actif",
  past_due: "Paiement en retard",
  canceled: "Annulé",
  expired: "Expiré",
};

const receiptStatusLabels: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvé",
  rejected: "Rejeté",
};

const subStatusLabels: Record<string, string> = {
  pending: "En attente",
  active: "Actif",
  canceled: "Annulé",
  failed: "Échoué",
};

function receiptBadgeVariant(status: string): "success" | "danger" | "warning" {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "warning";
}

function subBadgeVariant(status: string): "success" | "danger" | "warning" | "muted" {
  if (status === "active") return "success";
  if (status === "failed" || status === "canceled") return "danger";
  if (status === "pending") return "warning";
  return "muted";
}

function DashBadge({
  children,
  variant = "muted",
}: {
  children: React.ReactNode;
  variant?: "brand" | "success" | "warning" | "danger" | "muted";
}) {
  return <span className={cn("dash-badge", `dash-badge--${variant}`)}>{children}</span>;
}

function PlanFeatures({ planId, compact }: { planId: PlanId; compact?: boolean }) {
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) return null;

  const items = [
    `${plan.clientLimitLabel} clients`,
    `${plan.workerLimitLabel} workers`,
    `${plan.campaignLabel} campagnes`,
    `${plan.locationLabel} site(s)`,
    `Carte ${plan.cardDesign}`,
    plan.capabilities.whatsapp ? "WhatsApp Business" : null,
    plan.capabilities.apiAccess ? "Accès API" : null,
  ].filter(Boolean) as string[];

  return (
    <ul className={cn("dash-plan-features", compact && "dash-plan-features--compact")}>
      {items.map((item) => (
        <li key={item}>
          <Check size={compact ? 14 : 16} strokeWidth={2.5} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function BillingToggle({
  value,
  onChange,
}: {
  value: "monthly" | "annual";
  onChange: (v: "monthly" | "annual") => void;
}) {
  return (
    <div className="dash-billing-toggle" role="group" aria-label="Période de facturation">
      <button
        type="button"
        className={cn("dash-billing-toggle-btn", value === "monthly" && "is-active")}
        onClick={() => onChange("monthly")}
      >
        Mensuel
      </button>
      <button
        type="button"
        className={cn("dash-billing-toggle-btn", value === "annual" && "is-active")}
        onClick={() => onChange("annual")}
      >
        Annuel <span className="opacity-70">2 mois offerts</span>
      </button>
    </div>
  );
}

function BillingSectionDivider() {
  return <hr className="dash-section-divider" aria-hidden="true" />;
}

function BillingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="dash-skeleton h-20 w-72" />
      <BillingSectionDivider />
      <div className="dash-stat-grid dash-stat-grid--billing">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="dash-skeleton h-28 rounded-2xl" />
        ))}
      </div>
      <div className="dash-skeleton h-24 rounded-2xl" />
      <BillingSectionDivider />
      <div className="dash-plan-grid dash-plan-grid--3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="dash-skeleton h-80 rounded-2xl" />
        ))}
      </div>
      <div className="dash-billing-bottom-grid">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="dash-skeleton h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

const DISPLAY_PLANS: PlanId[] = ["boutique", "maison", "prestige"];

const PLAN_RANK: Record<PlanId, number> = {
  trial: 0,
  boutique: 1,
  maison: 2,
  prestige: 3,
};

function scrollToPlans() {
  document.getElementById("choose-plan")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function BillingPage() {
  const { tenant } = useCurrentTenant();
  const { user } = useAuth();
  const { data: billingDetails, isLoading: billingLoading } = useGetTenantBillingDetails();
  const updateBilling = useUpdateTenantBillingDetails();
  const { data: trialStatus, isLoading: trialLoading } = useGetTrialStatus();
  const { data: planUsage, isLoading: usageLoading } = useGetPlanUsage();
  const { data: bankDetails, isLoading: bankLoading } = useGetPlatformBankDetails();
  const { data: receipts, isLoading: receiptsLoading } = useGetTenantPaymentReceipts();
  const { data: subscriptions, isLoading: subsLoading } = useGetTenantSubscriptions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const checkout = useCreateChargilyCheckout();
  const submitReceipt = useSubmitPaymentReceipt();
  const boutiqueAffiliate = useAffiliatePricing("boutique", billingPeriod);
  const maisonAffiliate = useAffiliatePricing("maison", billingPeriod);
  const [uploadingPlanId, setUploadingPlanId] = useState<PlanId | null>(null);
  const [billingForm, setBillingForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
  });

  useEffect(() => {
    if (billingDetails || user) {
      setBillingForm({
        fullName: billingDetails?.billingFullName ?? "",
        phone: billingDetails?.billingPhone ?? "",
        email: billingDetails?.billingEmail ?? user?.email ?? "",
        address: billingDetails?.billingAddress ?? "",
      });
    }
  }, [billingDetails, user]);

  const billingComplete = hasBillingDetails(billingDetails);

  const currentPlanId = (trialStatus?.planId ?? tenant?.planId ?? "trial") as PlanId;
  const subscriptionStatus = trialStatus?.subscriptionStatus ?? tenant?.subscriptionStatus ?? "trialing";
  const canUpgrade = PLAN_RANK[currentPlanId] < PLAN_RANK.prestige;
  const upgradeLabel =
    currentPlanId === "trial"
      ? "Choisir un plan"
      : currentPlanId === "boutique"
        ? "Passer à Maison"
        : currentPlanId === "maison"
          ? "Passer à Prestige"
          : "Mettre à niveau";

  const activeSub = subscriptions?.find((s) => s.status === "active");
  const periodLabel = activeSub
    ? activeSub.billing_period === "annual"
      ? "Annuel"
      : "Mensuel"
    : billingPeriod === "annual"
      ? "Annuel"
      : "Mensuel";

  const accessUntil = tenant?.subscriptionEndsAt ?? trialStatus?.subscriptionEndsAt ?? trialStatus?.trialEndsAt;

  const affiliatePricingByPlan: Partial<Record<PlanId, typeof boutiqueAffiliate.data>> = {
    boutique: boutiqueAffiliate.data ?? undefined,
    maison: maisonAffiliate.data ?? undefined,
  };

  const activeAffiliateOffer = [boutiqueAffiliate.data, maisonAffiliate.data].find((p) => p?.eligible);

  const handleChargily = async (planId: PlanId) => {
    if (!billingComplete) {
      toast({
        title: "Coordonnées requises",
        description: "Enregistrez vos coordonnées de facturation avant de payer.",
        variant: "destructive",
      });
      return;
    }
    try {
      const result = await checkout.mutateAsync({ planId, billingPeriod });
      if (result.checkoutUrl) window.location.href = result.checkoutUrl;
    } catch (e) {
      toast({
        title: "Paiement indisponible",
        description: e instanceof Error ? e.message : "Erreur Chargily",
        variant: "destructive",
      });
    }
  };

  const handleReceiptUpload = async (planId: PlanId, file: File) => {
    if (!tenant) return;
    if (!billingComplete) {
      toast({
        title: "Coordonnées requises",
        description: "Enregistrez vos coordonnées de facturation avant d'envoyer un reçu.",
        variant: "destructive",
      });
      return;
    }
    setUploadingPlanId(planId);
    try {
      const path = `${tenant.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("payment-receipts").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("payment-receipts").getPublicUrl(path);
      const plan = PLANS.find((p) => p.id === planId);
      const affiliatePricing = affiliatePricingByPlan[planId];
      const amount =
        affiliatePricing?.eligible && affiliatePricing.amountDzd
          ? affiliatePricing.amountDzd
          : billingPeriod === "annual"
            ? plan?.annualDzd ?? 0
            : plan?.monthlyDzd ?? 0;

      await submitReceipt.mutateAsync({
        planId,
        billingPeriod,
        amountDzd: amount,
        receiptUrl: urlData.publicUrl,
        paymentMethod: "baridimob",
      });

      toast({ title: "Reçu envoyé", description: "Validation sous 24-48h ouvrées." });
      queryClient.invalidateQueries({ queryKey: getTenantQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["tenant-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["plan-usage"] });
      queryClient.invalidateQueries({ queryKey: ["trial-status"] });
    } catch (e) {
      toast({
        title: "Échec envoi",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setUploadingPlanId(null);
    }
  };

  const handleSaveBilling = async () => {
    try {
      await updateBilling.mutateAsync({
        fullName: billingForm.fullName.trim(),
        phone: billingForm.phone.replace(/\D/g, ""),
        email: billingForm.email.trim(),
        address: billingForm.address.trim() || undefined,
      });
      toast({ title: "Coordonnées enregistrées", description: "Vous pouvez maintenant procéder au paiement." });
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Échec de l'enregistrement",
        variant: "destructive",
      });
    }
  };

  if (trialLoading) return <BillingSkeleton />;

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="dash-billing-page"
    >
      <div className="dash-billing-page-head">
        <DashboardPageHeader
          title="Facturation"
          description="Plans, paiements et historique de votre abonnement."
        />
        <BillingSectionDivider />
      </div>

      <div className="dash-stat-grid dash-stat-grid--billing">
        <DashboardStatCard
          label="Plan actuel"
          value={trialStatus?.planName ?? currentPlanId}
          meta={statusLabels[subscriptionStatus] ?? subscriptionStatus}
          icon={Sparkles}
          accent="brand"
        />
        <DashboardStatCard
          label="Période"
          value={periodLabel}
          meta={periodLabel === "Annuel" ? "Facturation annuelle" : "Facturation mensuelle"}
          icon={Calendar}
          accent="neutral"
        />
        {accessUntil ? (
          <DashboardStatCard
            label={subscriptionStatus === "canceled" ? "Accès jusqu'au" : currentPlanId === "trial" ? "Fin de l'essai" : "Prochaine échéance"}
            value={new Date(accessUntil).toLocaleDateString("fr-DZ")}
            meta={
              currentPlanId === "trial" && trialStatus
                ? `${trialStatus.daysLeft} jour(s) restant(s)`
                : subscriptionStatus === "canceled"
                  ? "Non renouvelé"
                  : "Renouvellement automatique"
            }
            icon={Calendar}
            accent={subscriptionStatus === "canceled" ? "danger" : "success"}
          />
        ) : (
          <DashboardStatCard
            label="Paiements"
            value={receipts?.length ?? 0}
            meta="Reçus envoyés"
            icon={Receipt}
            accent="neutral"
          />
        )}
      </div>

      <motion.article className="dash-billing-sub-bar" variants={staggerItem}>
        <div className="dash-billing-sub-bar-info">
          <p className="dash-billing-sub-bar-title">
            {trialStatus?.planName ?? "Essai gratuit"} — {statusLabels[subscriptionStatus] ?? subscriptionStatus}
          </p>
          <p className="dash-billing-sub-bar-desc">
            Période {periodLabel.toLowerCase()}
            {accessUntil && (
              <>
                {" "}
                ·{" "}
                {subscriptionStatus === "canceled" ? "accès jusqu'au" : "échéance"}{" "}
                {new Date(accessUntil).toLocaleDateString("fr-DZ", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </>
            )}
          </p>
          <div className="dash-payment-methods mt-2">
            <span className="dash-payment-chip">
              <CreditCard size={14} />
              Chargily
            </span>
            <span className="dash-payment-chip">
              <Smartphone size={14} />
              BaridiMob
            </span>
            <span className="dash-payment-chip">
              <Building2 size={14} />
              CCP / CIB
            </span>
          </div>
        </div>
        {canUpgrade && subscriptionStatus !== "canceled" && (
          <button
            type="button"
            className="dash-btn-primary dash-billing-upgrade-btn !w-auto px-5"
            onClick={scrollToPlans}
          >
            <ArrowUpRight size={16} />
            {upgradeLabel}
          </button>
        )}
        {subscriptionStatus === "canceled" && (
          <button
            type="button"
            className="dash-btn-primary dash-billing-upgrade-btn !w-auto px-5"
            onClick={scrollToPlans}
          >
            <ArrowUpRight size={16} />
            Réactiver un plan
          </button>
        )}
      </motion.article>

      <motion.div variants={staggerItem}>
        <PlanLimitsCard
          planId={currentPlanId}
          trialStatus={trialStatus}
          usage={planUsage}
          loading={trialLoading || usageLoading}
        />
      </motion.div>

      <BillingSectionDivider />

      <motion.article className="dash-card" variants={staggerItem}>
        <div className="dash-card-header">
          <h2 className="dash-card-title flex items-center gap-2">
            <User size={18} className="text-[var(--dash-brand)]" />
            Coordonnées de facturation
          </h2>
          <p className="dash-section-desc mt-1">
            Requis avant tout paiement en ligne ou envoi de reçu.
          </p>
        </div>
        <div className="dash-card-body space-y-4">
          {billingLoading ? (
            <div className="dash-skeleton h-32 w-full rounded-xl" />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 block">
                  <span className="text-sm font-medium text-[var(--dash-text-secondary)]">Nom complet</span>
                  <Input
                    value={billingForm.fullName}
                    onChange={(e) => setBillingForm((f) => ({ ...f, fullName: e.target.value }))}
                    placeholder="Prénom Nom"
                  />
                </label>
                <label className="space-y-1.5 block">
                  <span className="text-sm font-medium text-[var(--dash-text-secondary)]">Téléphone</span>
                  <Input
                    type="tel"
                    value={billingForm.phone}
                    onChange={(e) => setBillingForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="05 55 12 34 56"
                  />
                </label>
                <label className="space-y-1.5 block">
                  <span className="text-sm font-medium text-[var(--dash-text-secondary)]">Email</span>
                  <Input
                    type="email"
                    value={billingForm.email}
                    onChange={(e) => setBillingForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="vous@exemple.com"
                  />
                </label>
                <label className="space-y-1.5 block sm:col-span-2">
                  <span className="text-sm font-medium text-[var(--dash-text-secondary)]">Adresse (optionnel)</span>
                  <Input
                    value={billingForm.address}
                    onChange={(e) => setBillingForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="Adresse de facturation"
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="dash-btn-primary !w-auto px-5"
                  onClick={() => void handleSaveBilling()}
                  disabled={updateBilling.isPending}
                >
                  {updateBilling.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Enregistrer
                </button>
                {billingComplete ? (
                  <DashBadge variant="success">Prêt pour le paiement</DashBadge>
                ) : (
                  <DashBadge variant="warning">À compléter avant paiement</DashBadge>
                )}
              </div>
            </>
          )}
        </div>
      </motion.article>

      <BillingSectionDivider />

      <motion.section id="choose-plan" variants={staggerItem}>
        <div className="dash-section-head">
          <div>
            <h2 className="dash-section-title">Choisir un plan</h2>
            <p className="dash-section-desc">
              Trois formules — paiement en ligne ou virement avec reçu. {ANNUAL_BILLING_NOTE}.
            </p>
          </div>
          <BillingToggle value={billingPeriod} onChange={setBillingPeriod} />
        </div>

        <div className="dash-plan-grid dash-plan-grid--3">
          {DISPLAY_PLANS.map((planId) => {
            const plan = PLANS.find((p) => p.id === planId)!;
            const isPrestige = planId === "prestige";
            const listPrice = billingPeriod === "annual" ? plan.annualDzd : plan.monthlyDzd;
            const affiliatePricing = affiliatePricingByPlan[planId];
            const price =
              affiliatePricing?.eligible && affiliatePricing.amountDzd
                ? affiliatePricing.amountDzd
                : listPrice;
            const isCurrent = currentPlanId === planId && subscriptionStatus === "active";
            const featured = planId === "maison";
            const isUploading = uploadingPlanId === planId;

            return (
              <motion.article
                key={planId}
                className={cn(
                  "dash-plan-card dash-plan-card--compact",
                  isCurrent && "dash-plan-card--current",
                  featured && !isCurrent && "dash-plan-card--featured",
                )}
                whileHover={{ y: -2 }}
              >
                <div>
                  <div className="dash-plan-top">
                    <div>
                      <h3 className="dash-plan-name">
                        {plan.emoji} {plan.name}
                      </h3>
                      <p className="dash-plan-desc">{plan.description}</p>
                    </div>
                    {isCurrent && <DashBadge variant="success">Actuel</DashBadge>}
                    {featured && !isCurrent && <DashBadge variant="brand">Top</DashBadge>}
                  </div>
                  <p className="dash-plan-price">
                    {affiliatePricing?.eligible && listPrice != null && price !== listPrice ? (
                      <>
                        <span className="line-through opacity-50 text-lg mr-2">{formatDzd(listPrice)}</span>
                        {formatDzd(price)}
                      </>
                    ) : (
                      formatDzd(price)
                    )}
                    {!isPrestige && price !== null && (
                      <span>{billingPeriod === "annual" ? "/an" : "/mois"}</span>
                    )}
                  </p>
                </div>

                <PlanFeatures planId={planId} compact />

                <div className="dash-plan-actions">
                  {isPrestige ? (
                    <a
                      href={`mailto:${PLATFORM.supportEmail}?subject=Plan%20Prestige`}
                      className="dash-btn-primary"
                    >
                      <Mail className="h-4 w-4" />
                      Demander un devis
                    </a>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="dash-btn-primary"
                        onClick={() => void handleChargily(planId)}
                        disabled={checkout.isPending || isCurrent || !billingComplete}
                      >
                        {checkout.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CreditCard className="h-4 w-4" />
                        )}
                        Chargily
                      </button>
                      <label className="dash-upload-btn">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleReceiptUpload(planId, file);
                            e.target.value = "";
                          }}
                          disabled={isUploading || isCurrent || !billingComplete}
                        />
                        <span className="dash-btn-secondary">
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          Reçu BaridiMob
                        </span>
                      </label>
                    </>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      </motion.section>

      <motion.section className="dash-billing-bottom-grid" variants={staggerItem}>
        <article className="dash-card dash-bank-card">
          <div className="dash-card-header">
            <h2 className="dash-card-title flex items-center gap-2">
              <Building2 size={18} className="text-[var(--dash-brand)]" />
              Coordonnées bancaires
            </h2>
          </div>
          <div className="dash-card-body pt-0">
            {bankLoading ? (
              <div className="dash-skeleton h-20 w-full rounded-xl" />
            ) : (
              <p className="dash-bank-text">{bankDetails}</p>
            )}
          </div>
        </article>

        <article className="dash-card">
          <div className="dash-card-header">
            <h2 className="dash-card-title flex items-center gap-2">
              <Receipt size={18} className="text-[var(--dash-brand)]" />
              Historique reçus
            </h2>
          </div>
          <div className="dash-card-body pt-0 dash-billing-scroll-panel">
            {receiptsLoading ? (
              <div className="dash-skeleton h-32 w-full rounded-xl" />
            ) : !receipts?.length ? (
              <div className="dash-billing-empty">
                <Receipt size={24} className="opacity-40" />
                <p>Aucun reçu envoyé.</p>
              </div>
            ) : (
              <div className="dash-receipt-list">
                {receipts.map((r) => {
                  const planName = PLANS.find((p) => p.id === r.plan_id)?.name ?? r.plan_id;
                  return (
                    <div key={r.id} className="dash-receipt-row">
                      <div className="min-w-0">
                        <p className="dash-receipt-title">
                          {planName} — {formatDzd(r.amount_dzd)}
                        </p>
                        <p className="dash-receipt-meta">
                          {r.billing_period === "annual" ? "Annuel" : "Mensuel"} ·{" "}
                          {new Date(r.created_at).toLocaleDateString("fr-DZ")}
                        </p>
                      </div>
                      <DashBadge variant={receiptBadgeVariant(r.status)}>
                        {receiptStatusLabels[r.status] ?? r.status}
                      </DashBadge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </article>

        <article className="dash-card">
          <div className="dash-card-header">
            <h2 className="dash-card-title flex items-center gap-2">
              <History size={18} className="text-[var(--dash-brand)]" />
              Historique abonnements
            </h2>
          </div>
          <div className="dash-card-body pt-0 dash-billing-scroll-panel">
            {subsLoading ? (
              <div className="dash-skeleton h-32 w-full rounded-xl" />
            ) : !subscriptions?.length ? (
              <div className="dash-billing-empty">
                <History size={24} className="opacity-40" />
                <p>Aucun paiement en ligne pour le moment.</p>
              </div>
            ) : (
              <div className="dash-receipt-list">
                {subscriptions.map((s) => {
                  const planName = PLANS.find((p) => p.id === s.plan_id)?.name ?? s.plan_id;
                  return (
                    <div key={s.id} className="dash-receipt-row">
                      <div className="min-w-0">
                        <p className="dash-receipt-title">
                          {planName} — {formatDzd(s.amount_dzd)}
                        </p>
                        <p className="dash-receipt-meta">
                          {s.billing_period === "annual" ? "Annuel" : "Mensuel"}
                          {s.starts_at && (
                            <>
                              {" "}
                              · {new Date(s.starts_at).toLocaleDateString("fr-DZ")}
                              {s.ends_at && ` → ${new Date(s.ends_at).toLocaleDateString("fr-DZ")}`}
                            </>
                          )}
                        </p>
                      </div>
                      <DashBadge variant={subBadgeVariant(s.status)}>
                        {subStatusLabels[s.status] ?? s.status}
                      </DashBadge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </article>
      </motion.section>

      <motion.p className="dash-footer-note" variants={staggerItem}>
        Besoin d&apos;aide ?{" "}
        <a href={`mailto:${PLATFORM.supportEmail}`}>{PLATFORM.supportEmail}</a>
      </motion.p>
    </motion.div>
  );
}
