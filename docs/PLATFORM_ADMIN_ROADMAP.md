# Console plateforme `/platform` — inventaire, KPIs et feuille de route

> **Statut implémentation (juin 2026)** — UI + SQL 004/005 branchés. Voir section « Déployé » en bas.

Document de référence pour le **propriétaire SaaS** (rôle `super_admin`).
---

## 1. Accès et architecture

| Élément | Détail |
|--------|--------|
| URL | `http://localhost:5173/platform` (prod : domaine racine) |
| Rôle requis | `profiles.role = 'super_admin'`, `tenant_id IS NULL` |
| Gate UI | `access-denied.tsx` si non autorisé |
| API | RPC Supabase + tables directes + edge functions |
| Migrations | `002_platform_admin.sql` (base) → **`004_platform_analytics_complete.sql`** (KPIs étendus) |

### Routes existantes

| Route | Page | Rôle |
|-------|------|------|
| `/platform` | Vue d’ensemble | KPIs globaux, graphiques 30j, plans, commerces récents |
| `/platform/businesses` | Liste commerces | Recherche, filtres plan/statut, tableau |
| `/platform/businesses/:id` | Fiche commerce | Stats, override plan, abonnements, reçus, scans récents |
| `/platform/subscriptions` | Abonnements | Liste lecture seule (Chargily + statuts) |
| `/platform/payments` | Paiements | Validation reçus BaridiMob (approuver / rejeter) |
| `/platform/analytics` | Analytics | Top commerces, moyennes (calcul client) |
| `/platform/settings` | Paramètres | Coordonnées bancaires globales |

### Edge functions liées

| Function | Usage plateforme |
|----------|------------------|
| `review-payment-receipt` | Approuver / rejeter un reçu manuel |
| `override-tenant-plan` | Forcer un plan + date de fin |
| `register-tenant` | Inscription nouveau commerce |
| `chargily-webhook` / `create-chargily-checkout` | Paiement en ligne |
| `cancel-subscription` | Annulation côté tenant (pas encore exposé admin) |
| `delete-tenant-account` | Suppression compte tenant (pas encore exposé admin) |

---

## 2. Ce qui existe aujourd’hui (par écran)

### 2.1 Vue d’ensemble (`/platform`)

**Affiché :**
- Commerces (total, actifs, essai, expirés)
- Clients totaux, scans (jour / semaine / total)
- MRR estimé, abonnements actifs
- Récompenses totales
- Graphiques : inscriptions 30j, scans 30j
- Répartition par plan
- Tableau 8 derniers commerces

**Manque à l’écran (données déjà en SQL 004) :**
- ARR, revenus approuvés (total / mois)
- Cartes actives vs bloquées, inscriptions jour/semaine/mois
- Employés (total / actifs)
- Fraude (scans bloqués, taux)
- Essais expirant sous 7 jours
- Taux onboarding / tutoriel dashboard
- Graphique inscriptions cartes (`enrolmentsByDay`)
- Graphique revenus (`revenueByDay`)
- MRR par plan (`mrrByPlan`)

### 2.2 Commerces (`/platform/businesses`)

**Affiché :** nom, slug, plan, statut, clients, scans, employés, propriétaire, lien détail.

**Manque (SQL 004 fournit) :**
- Colonnes : cartes actives, fraude, récompenses en attente, produits, campagnes
- Croissance 7j (`newClients7d`)
- Dernière activité (`lastScanAt`, `lastEnrolmentAt`)
- Onboarding / tutoriel complétés
- Date fin abonnement
- Actions : suspendre, supprimer, impersonner, export CSV

### 2.3 Fiche commerce (`/platform/businesses/:id`)

**Affiché :** 4 KPIs, propriétaire, override plan, abonnements, reçus, 10 derniers scans.

**Manque (SQL 004 fournit) :**
- Cartes actives / bloquées, croissance 7j / 30j
- Scans semaine / mois, fraude
- Employés actifs / inactifs + **liste workers avec scans**
- Récompenses (total, en attente, échangées)
- Timbres totaux émis (`totalStampsIssued`)
- 10 dernières cartes émises
- Paramètres boutique (seuil tampons, WhatsApp configuré, etc.)
- Limites plan vs usage réel
- Boutons : prolonger essai, annuler abo, reset onboarding, voir logs audit

### 2.4 Abonnements (`/platform/subscriptions`)

**Affiché :** liste complète avec commerce, plan, montant, statut, dates.

**Manque :**
- Filtres (statut, plan, période)
- Action admin : prolonger, annuler, marquer failed
- Lien Chargily payment ID
- Revenu récurrent réel vs estimé MRR
- Export

### 2.5 Paiements (`/platform/payments`)

**Affiché :** onglets pending / approved / rejected / all, aperçu reçu, approuver / rejeter.

**Manque :**
- Notes de révision (`reviewer_notes`) visibles / éditables
- Motif de rejet obligatoire
- Approbation en lot
- Statistiques reçus (délai moyen de validation)
- Prévisualisation image reçu inline

### 2.6 Analytics (`/platform/analytics`)

**Affiché :** moyennes clients/scans par commerce, « conversion essai → actif » (formule incorrecte), top 10 clients/scans (calcul client).

**Problème connu :** `activeTenants / totalTenants` n’est **pas** la conversion essai → payant. Utiliser `trialToPaidRate` du RPC 004.

**Manque (RPC `get_platform_analytics` en 004) :**
- Top croissance 7j
- Top revenus (reçus approuvés cumulés)
- Classement employés (scans par worker)
- Économie par plan (tenants, MRR par plan)
- Scores santé commerce (jours depuis dernier scan, scans 30j)
- Graphiques séries temporelles dédiés

### 2.7 Paramètres (`/platform/settings`)

**Affiché :** coordonnées bancaires (CCP/CIB) pour virements tenants.

**Manque :**
- Gestion autres `platform_settings` (logo, support email, maintenance mode)
- Gestion comptes `super_admin`
- Config Chargily (clés — via secrets, pas en DB)
- Plans : édition prix / limites sans migration SQL
- Feature flags globaux
- Logs d’audit admin

---

## 3. Dictionnaire KPI — métriques business

### 3.1 Commerces (tenants)

| KPI | Description | Source SQL 004 |
|-----|-------------|----------------|
| `totalTenants` | Boutiques inscrites | `tenants` |
| `activeTenants` | Abonnement actif | `subscription_status = 'active'` |
| `trialingTenants` | En période d’essai | `subscription_status = 'trialing'` |
| `pastDueTenants` | Paiement en retard | `past_due` |
| `canceledTenants` | Annulés | `canceled` |
| `expiredTenants` | Expirés + retard + annulés | agrégat |
| `newTenantsToday/Week/Month` | Acquisition | `tenants.created_at` |
| `trialExpiring7d` | Essais finissant sous 7j | `trial_ends_at` |
| `onboardingCompleteCount` | Wizard terminé | `onboarding_complete` |
| `tutorialCompleteCount` | Tour dashboard vu | `dashboard_tutorial_complete` |
| `onboardingRate` | % commerces ayant fini l’onboarding | calcul |
| `trialToPaidRate` | % passés en plan payant (hors trial) | calcul |
| `tenantsByPlan` | Répartition plans | group by `plan_id` |
| `tenantsByStatus` | Répartition statuts abo | group by `subscription_status` |

### 3.2 Cartes fidélité (clients)

| KPI | Description | Source |
|-----|-------------|--------|
| `totalClients` | Cartes émises (toutes) | `clients` |
| `activeCards` | Cartes non bloquées | `is_blocked = false` |
| `blockedCards` | Cartes bloquées (fraude admin) | `is_blocked = true` |
| `clientsEnrolledToday/Week/Month` | Nouvelles inscriptions | `enrolled_at` |
| `enrolmentsByDay` | Série 30 jours | agrégat journalier |
| Par tenant : `activeCardCount`, `newClients7d`, `lastEnrolmentAt` | Fiche / liste | RPC tenants |

**Champs carte utiles (non encore agrégés plateforme) :**
- `total_stamps`, `current_cycle_stamps`, `total_rewards_earned`
- `card_code` (6 chiffres), `last_scan_at`
- Taux de rétention (clients avec scan &lt; 30j)

### 3.3 Scans & engagement

| KPI | Description | Source |
|-----|-------------|--------|
| `totalScans` | Scans approuvés | `scan_logs.status = 'approved'` |
| `scansToday/Week/Month` | Volume récent | `scanned_at` |
| `fraudScansTotal/Today` | Scans bloqués | `blocked_fraud`, `blocked_limit` |
| `fraudRate` | % scans non approuvés | calcul |
| `scansByDay` | Série 30j | agrégat |
| `totalStampsIssued` | Tampons cumulés (tenant) | `sum(total_stamps)` |

### 3.4 Récompenses

| KPI | Description |
|-----|-------------|
| `totalRewards` | Récompenses générées |
| `rewardsRedeemed` | Échangées en caisse |
| `rewardsPending` | En attente d’échange |
| Par tenant : idem + lien worker `redeemed_by_worker_id` |

### 3.5 Employés (workers)

| KPI | Description |
|-----|-------------|
| `totalWorkers` | Comptes worker créés |
| `activeWorkers` | `is_active = true` |
| `totalOwners` | Propriétaires |
| `avgWorkersPerTenant` | Moyenne plateforme |
| `workerLeaderboard` | Top 20 workers par scans (analytics RPC) |
| Par tenant : liste workers + `scanCount` par worker |

### 3.6 Catalogue & campagnes

| KPI | Description |
|-----|-------------|
| `totalProducts` / `activeProducts` | Produits référencés |
| `totalCampaigns` | Campagnes marketing créées |
| Par tenant : `productCount`, `campaignCount` |

### 3.7 Revenus & facturation

| KPI | Description | Calcul |
|-----|-------------|--------|
| `estimatedMrrDzd` | MRR théorique | Σ `price_monthly_dzd` des tenants `active` |
| `estimatedArrDzd` | ARR | MRR × 12 |
| `revenueApprovedTotalDzd` | Cash encaissé (reçus validés) | Σ `payment_receipts` approved |
| `revenueApprovedThisMonthDzd` | Encaissement mois courant | filtre `created_at` |
| `revenueByDay` | Série 30j reçus approuvés | agrégat |
| `pendingReceipts` | Reçus à valider | `status = pending` |
| `activeSubscriptions` | Abos Chargily actifs | `subscriptions.status = active` |
| `chargilyPaymentsCount` | Paiements auto actifs | `chargily_payment_id IS NOT NULL` |
| `baridimobPaymentsCount` | Paiements manuels approuvés | `payment_method IN (...)` |
| `mrrByPlan` | MRR détaillé par plan | breakdown JSON |
| `planEconomics` | Tenants + MRR par plan | analytics RPC |

**Limites actuelles :**
- MRR ne compte pas la facturation **annuelle** proratisée (utilise toujours `price_monthly_dzd`).
- Revenus Chargily one-shot non fusionnés dans `revenueApprovedTotalDzd` (seulement reçus manuels).

### 3.8 Moyennes plateforme

| KPI | Description |
|-----|-------------|
| `avgClientsPerTenant` | Clients / commerce |
| `avgScansPerTenant` | Scans approuvés / commerce |
| `avgWorkersPerTenant` | Workers actifs / commerce |

### 3.9 Santé commerce (analytics RPC `healthScores`)

Par commerce :
- `clientCount`, `scanCount30d`
- `daysSinceLastScan` (alerte churn usage)
- `onboardingComplete`, `subscriptionStatus`

---

## 4. Feuille de route — priorités

### P0 — Données déjà en SQL, brancher l’UI

1. Exécuter `004_platform_analytics_complete.sql` dans Supabase SQL Editor.
2. Étendre `PlatformOverview` / `PlatformTenantRow` / `PlatformTenantDetail` dans `src/api/platform.ts`.
3. Overview : 2e rangée KPIs (ARR, cartes, employés, fraude, essais expirant).
4. Overview : graphiques inscriptions cartes + revenus.
5. Analytics : remplacer calculs client par `get_platform_analytics()`.
6. Corriger métrique conversion → `trialToPaidRate`.

### P1 — Actions admin critiques

| Action | Edge function / RPC à créer |
|--------|----------------------------|
| Suspendre commerce | `suspend-tenant` → `subscription_status = 'expired'` |
| Prolonger essai | `extend-trial` → `trial_ends_at` |
| Annuler abo (admin) | réutiliser `cancel-subscription` avec guard super_admin |
| Supprimer commerce | `delete-tenant-account` avec guard super_admin |
| Impersonner owner | token magic link one-time (sécurité élevée) |
| Notes rejet reçu | champ UI → `review-payment-receipt` |

### P2 — Reporting & exports

- Export CSV commerces / abonnements / reçus
- Rapport hebdomadaire email au super_admin
- Dashboard « alertes » : essais J-3, reçus &gt; 48h, commerces inactifs 14j

### P3 — Configuration plateforme

- CRUD plans (prix, limites) via UI
- `platform_settings` étendu : support_email, maintenance_banner
- Gestion super_admins
- Audit log table : `platform_audit_log (actor_id, action, target_tenant_id, meta, created_at)`

### P4 — KPIs avancés (nouvelle migration)

| Métrique | Complexité |
|----------|------------|
| Churn mensuel (tenants canceled ce mois / actifs début mois) | Moyenne |
| LTV estimé par tenant | Moyenne |
| Cohortes rétention (M0, M1, M2…) | Élevée |
| NRR / expansion revenue | Élevée |
| Coût support par tenant | Manuel |
| Taux échange récompenses | Faible (`redeemed / total`) |
| Scans par worker / jour | Faible |

---

## 5. RPC Supabase — référence rapide

### `get_platform_overview()` → JSONB

Retourne tous les KPIs section 3 (vue globale + séries 30j).

### `get_platform_tenants()` → JSONB array

Une ligne par commerce avec métriques opérationnelles enrichies.

### `get_platform_tenant_detail(p_tenant_id)` → JSONB

Fiche complète : workers, scans, clients récents, shop_settings, billing.

### `get_platform_analytics()` → JSONB *(nouveau en 004)*

Payload dédié page Analytics : tops, leaderboard workers, plan economics, health scores.

**Sécurité :** toutes les RPC vérifient `is_super_admin()` ; `GRANT EXECUTE` à `authenticated` uniquement.

---

## 6. Déploiement

```text
Ordre migrations Supabase :
1. 001_saas_complete.sql
2. 002_onboarding_tutorial.sql   (dashboard_tutorial_complete)
3. 002_platform_admin.sql
4. 003_shop_settings_realtime.sql
5. 004_platform_analytics_complete.sql  ← KPIs étendus
6. 005_platform_admin_complete.sql      ← alertes, audit, settings
```

Edge functions à déployer :
- `platform-tenant-action` (suspendre, essai, reset onboarding, annuler, supprimer)
- `review-payment-receipt` (motif rejet obligatoire)

Après migration, recharger `/platform`. Si erreur « Forbidden », vérifier `role = super_admin`.

### Déployé dans le code

| Priorité | Statut |
|----------|--------|
| P0 — KPIs overview, analytics RPC, graphiques | ✅ |
| P1 — Actions admin tenant | ✅ (`platform-tenant-action`) |
| P1 — Notes rejet reçu | ✅ |
| P2 — Export CSV commerces / abos / reçus | ✅ |
| P2 — Page Alertes | ✅ `/platform/alerts` |
| P3 — Settings étendus + audit log | ✅ |
| P3 — CRUD plans UI | ⏳ (édition SQL uniquement) |
| P3 — Impersonate owner | ⏳ (non implémenté — sécurité) |
| P4 — Churn/LTV/cohortes avancées | Partiel (`monthlyChurnCount`, `rewardRedemptionRate`) |
| P2 — Email hebdo digest | ⏳ |
---

## 7. Résumé exécutif pour le propriétaire SaaS

**Vous voyez déjà :** combien de commerces, combien paient, MRR estimé, volume clients/scans, validation des virements BaridiMob, override manuel des plans.

**La migration 004 vous donne en base (à afficher ensuite) :** ARR, revenus encaissés, cartes actives/bloquées, croissance inscriptions, employés, fraude, essais qui expirent, performance par worker, santé de chaque commerce, économie par plan.

**Il vous manque encore côté produit :** actions de modération (suspendre / supprimer), exports, alertes proactives, config plans sans SQL, audit trail, et métriques de churn/LTV de niveau « board investor ».

---

*Fichier SQL : `supabase/migrations/004_platform_analytics_complete.sql`*  
*API front : `src/api/platform.ts`*  
*Pages : `src/pages/platform/*`*
