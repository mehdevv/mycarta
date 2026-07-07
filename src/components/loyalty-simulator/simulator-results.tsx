import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Heart,
  Lightbulb,
  Sparkles,
  Store,
  Wallet,
} from "lucide-react";
import { formatDzd } from "@/lib/pricing";
import type { OptimizerResult, StrategyRecommendation } from "@/lib/loyalty-optimizer";
import { MerchantSimpleKpis, MerchantOutcomeDetails } from "./merchant-outcome-panel";
import { BreakevenPanel } from "./breakeven-panel";
import { AiPlanButton } from "./ai-plan-button";

interface SimulatorResultsProps {
  result: OptimizerResult | null;
  ready: boolean;
  /** Embedded in the main flow column (no empty placeholder). */
  inline?: boolean;
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="pulse-score-row">
      <div className="pulse-score-label">
        <span>{label}</span>
        <span>{Math.round(value)}/100</span>
      </div>
      <div className="pulse-score-track">
        <motion.div
          className="pulse-score-fill"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function mainRule(strategy: StrategyRecommendation): string {
  if (strategy.stampsEnabled && strategy.stampThreshold != null) {
    return `${strategy.stampThreshold} tampons → récompense`;
  }
  if (strategy.spendEnabled && strategy.spendThresholdDzd != null) {
    return `${formatDzd(strategy.spendThresholdDzd)} → réduction`;
  }
  return strategy.title;
}

function StrategyCard({
  strategy,
  featured = false,
}: {
  strategy: StrategyRecommendation;
  featured?: boolean;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <article className={`pulse-strategy-card ${featured ? "pulse-strategy-featured" : ""}`}>
      {featured && (
        <div className="pulse-strategy-ribbon">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
          Recommandation Pulse
        </div>
      )}

      <div className="pulse-strategy-head">
        <div>
          <h3 className="pulse-strategy-title">{mainRule(strategy)}</h3>
          <p className="pulse-strategy-reward-line">{strategy.rewardDescription}</p>
        </div>
        {featured && (
          <div className="pulse-strategy-score" title="Score Pulse">
            {Math.round(strategy.score)}
          </div>
        )}
      </div>

      <MerchantSimpleKpis merchant={strategy.merchant} />

      {!featured && (
        <>
          <p className="pulse-strategy-summary">{strategy.customerPitch}</p>
          <p className="pulse-strategy-reward-line">{strategy.rewardDescription}</p>
        </>
      )}

      {featured && (
        <p className="pulse-strategy-summary pulse-strategy-summary-compact">
          {strategy.customerPitch}
        </p>
      )}

      {!featured && <MerchantOutcomeDetails merchant={strategy.merchant} />}

      <button
        type="button"
        className="pulse-details-toggle pulse-details-toggle-secondary"
        onClick={() => setDetailsOpen((v) => !v)}
        aria-expanded={detailsOpen}
      >
        {detailsOpen ? "Masquer" : "Voir"} le détail complet
        <ChevronDown className={`h-4 w-4 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
      </button>

      {detailsOpen && (
        <div className="pulse-strategy-details">
          <div className="pulse-dual-lens">
            <div className="pulse-lens pulse-lens-client">
              <p className="pulse-lens-label">
                <Heart className="h-3.5 w-3.5" aria-hidden />
                Pour le client
              </p>
              <p className="pulse-lens-value">{strategy.customerPitch}</p>
            </div>
            <div className="pulse-lens pulse-lens-merchant">
              <p className="pulse-lens-label">
                <Store className="h-3.5 w-3.5" aria-hidden />
                Pour vous
              </p>
              <p className="pulse-lens-value">{strategy.whyItWorks}</p>
            </div>
          </div>

          <div className="pulse-verdict-stats pulse-verdict-stats-inline">
            {strategy.stampsEnabled && strategy.stampThreshold != null && (
              <div className="pulse-verdict-stat">
                <p className="pulse-verdict-stat-label">Tampons</p>
                <p className="pulse-verdict-stat-value">{strategy.stampThreshold}</p>
              </div>
            )}
            {strategy.spendEnabled && strategy.spendThresholdDzd != null && (
              <div className="pulse-verdict-stat">
                <p className="pulse-verdict-stat-label">Palier</p>
                <p className="pulse-verdict-stat-value">{formatDzd(strategy.spendThresholdDzd)}</p>
              </div>
            )}
            <div className="pulse-verdict-stat">
              <p className="pulse-verdict-stat-label">Marge conservée</p>
              <p className="pulse-verdict-stat-value">{strategy.marginRetainedPercent.toFixed(0)}%</p>
            </div>
            <div className="pulse-verdict-stat">
              <p className="pulse-verdict-stat-label">Réduction effective</p>
              <p className="pulse-verdict-stat-value">
                {strategy.effectiveDiscountPercent.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="pulse-metrics-grid">
            <div className="pulse-metric">
              <div>
                <p className="pulse-metric-label">Marge brute / cycle</p>
                <p className="pulse-metric-value">
                  {formatDzd(Math.round(strategy.grossMarginPerCycleDzd))}
                </p>
              </div>
            </div>
            <div className="pulse-metric">
              <div>
                <p className="pulse-metric-label">Marge nette / cycle</p>
                <p className="pulse-metric-value">
                  {formatDzd(Math.round(strategy.netMarginPerCycleDzd))}
                </p>
              </div>
            </div>
            <div className="pulse-metric">
              <div>
                <p className="pulse-metric-label">Coût récompense</p>
                <p className="pulse-metric-value">{formatDzd(Math.round(strategy.rewardCostDzd))}</p>
              </div>
            </div>
            <div className="pulse-metric">
              <Wallet className="h-4 w-4 shrink-0 text-[var(--landing-brand)]" aria-hidden />
              <div>
                <p className="pulse-metric-label">Coût estimé / mois</p>
                <p className="pulse-metric-value">
                  {formatDzd(Math.round(strategy.monthlyRewardCostEstimateDzd))}
                </p>
              </div>
            </div>
          </div>

          {strategy.milestones && strategy.milestones.length > 0 && (
            <div className="pulse-milestones">
              <p className="pulse-milestones-label">Jalons intermédiaires</p>
              {strategy.milestones.map((m) => (
                <span key={m.position} className="pulse-milestone-chip">
                  Tampon {m.position} — {m.label}
                </span>
              ))}
            </div>
          )}

          <ScoreBar label="Motivation client" value={strategy.motivationScore} color="#1a56db" />
          <ScoreBar label="Sécurité marge" value={strategy.safetyScore} color="#059669" />
          <ScoreBar label="Score global Pulse" value={strategy.score} color="#7c3aed" />

          <p className="pulse-strategy-why">{strategy.whyItWorks}</p>
        </div>
      )}
    </article>
  );
}

function ResultsEmpty() {
  return (
    <div className="pulse-results-empty">
      <div className="pulse-results-empty-icon" aria-hidden>
        <Sparkles className="h-6 w-6" />
      </div>
      <h3 className="pulse-results-empty-title">Votre analyse apparaîtra ici</h3>
      <p className="pulse-results-empty-desc">
        Choisissez votre commerce, puis entrez panier et marge. Pulse calibre automatiquement
        visites, clients, budget et type de programme pour le sweet spot motivation × profit.
      </p>
    </div>
  );
}

export function SimulatorResults({ result, ready, inline = false }: SimulatorResultsProps) {
  const [alternatesOpen, setAlternatesOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);

  if (!ready || !result) {
    if (inline) return null;
    return (
      <div className="pulse-results">
        <header className="pulse-panel-head pulse-panel-head-compact">
          <p className="pulse-panel-eyebrow">Résultat</p>
          <h2 className="pulse-panel-title">Votre bilan en 3 chiffres</h2>
        </header>
        <ResultsEmpty />
      </div>
    );
  }

  const { best, strategies, insights } = result;
  const alternates = strategies.slice(1);

  return (
    <div className={`pulse-results ${inline ? "pulse-results-inline" : ""}`}>
      <header className="pulse-panel-head pulse-panel-head-compact">
        <p className="pulse-panel-eyebrow">Votre verdict</p>
        <h2 className="pulse-panel-title">Est-ce rentable ?</h2>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${best.id}-${best.stampThreshold}-${best.spendThresholdDzd}-${best.score}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <StrategyCard strategy={best} featured />
        </motion.div>
      </AnimatePresence>

      <BreakevenPanel merchant={best.merchant} suggestions={result.breakevenSuggestions} />

      <AiPlanButton strategy={best} />

      {insights.length > 0 && (
        <div className="pulse-insights-collapsible">
          <button
            type="button"
            className="pulse-alternates-toggle"
            onClick={() => setInsightsOpen((v) => !v)}
            aria-expanded={insightsOpen}
          >
            <Lightbulb className="h-4 w-4" aria-hidden />
            {insightsOpen ? "Masquer" : "Voir"} les conseils Pulse ({insights.length})
            <ChevronDown className={`h-4 w-4 transition-transform ${insightsOpen ? "rotate-180" : ""}`} />
          </button>
          {insightsOpen && (
            <div className="pulse-insights">
              <ul>
                {insights.map((tip) => (
                  <li key={tip}>
                    <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {alternates.length > 0 && (
        <div className="pulse-alternates-block">
          <button
            type="button"
            className="pulse-alternates-toggle"
            onClick={() => setAlternatesOpen((v) => !v)}
            aria-expanded={alternatesOpen}
          >
            Comparer {alternates.length} autre{alternates.length > 1 ? "s" : ""} option
            {alternates.length > 1 ? "s" : ""}
            <ChevronDown className={`h-4 w-4 transition-transform ${alternatesOpen ? "rotate-180" : ""}`} />
          </button>
          {alternatesOpen && (
            <div className="pulse-alternates-list">
              {alternates.map((s) => (
                <StrategyCard key={`${s.id}-${s.rank}-${s.title}`} strategy={s} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="pulse-cta-box pulse-cta-box-compact">
        <h3>Lancer avec ces réglages</h3>
        <p>Créez votre carte Carta en 2 minutes.</p>
        <Link href="/shop?tab=signup" className="btn-pill pulse-cta-btn">
          Créer ma carte
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
