# Carta — Product & Technical Documentation

> **Carta** is a multi-tenant SaaS platform for **digital loyalty cards**, built for French-speaking businesses in **Algeria**. Shop owners launch branded digital stamp-card programs; customers enroll via QR/link with **no app install**; workers scan cards at checkout; owners manage CRM, analytics, billing, and branding from a dashboard.

- **Tagline:** _Cartes fidélité digitales pour votre commerce_
- **Hero promise:** _Fidélisez vos clients sans carte papier_
- **Market:** Algeria (Alger, Oran, Constantine…) — language **French** (with English client option)
- **Currency:** Dinars Algériens (**DA / DZD**)
- **Internal package name:** `loyalqr-platform`

---

## Table of Contents

1. [The Idea](#1-the-idea)
2. [How It Works](#2-how-it-works)
3. [User Roles](#3-user-roles)
4. [Features](#4-features)
5. [Pricing & Plans](#5-pricing--plans)
6. [Tech Stack](#6-tech-stack)
7. [Architecture & Multi-Tenancy](#7-architecture--multi-tenancy)
8. [Database](#8-database)
9. [Edge Functions (Backend API)](#9-edge-functions-backend-api)
10. [Billing & Payments](#10-billing--payments)
11. [AI Card Designer](#11-ai-card-designer)
12. [Branding & White-Label](#12-branding--white-label)
13. [Anti-Fraud System](#13-anti-fraud-system)
14. [Routes Map](#14-routes-map)
15. [Environment & Deployment](#15-environment--deployment)
16. [Roadmap / Not Yet Shipped](#16-roadmap--not-yet-shipped)

---

## 1. The Idea

Paper loyalty cards lose businesses money: customers lose their cards and never return, shops collect zero customer data, fraud is trivial (anyone can stamp a card), and there's no way to re-engage past customers.

**Carta replaces paper loyalty cards with:**

- A **digital stamp card** customers access via a 6-digit code or QR link — no app to download.
- An **integrated CRM** that captures every customer (name, phone, scan history) automatically.
- **Analytics** showing what products drive loyalty, which customers are near a reward, and worker performance.
- **Anti-fraud** scan rules so loyalty rewards go to real customers.
- A **white-label** experience so each shop's customers only see that shop's brand.

Each business is a fully isolated **tenant** with its own public URL (`/{slug}/client`), branding, workers, and customer base.

---

## 2. How It Works

A 4-step loop (from the landing page "How it works" section):

1. **The client scans** — A QR at the counter. Name + phone, card created in seconds, no app.
2. **The team records** — Worker scans the card and selects products. Every sale is tracked.
3. **Stamps add up** — Each visit adds a stamp. The reward triggers automatically at the threshold.
4. **You follow up** — Targeted WhatsApp or email by stamps, last visit, or pending reward _(roadmap)_.

---

## 3. User Roles

| Role | Login | Scope | Lands on |
|------|-------|-------|----------|
| **Owner** | `/shop` | One shop (tenant) admin | `/dashboard` (or onboarding) |
| **Worker** | `/{slug}/employee` | Scan app for one tenant | `/worker` |
| **Super Admin** | `/shop` → redirect | Platform operator, no tenant | `/platform` |
| **Customer** | No login | Enrolls with phone; card via 6-digit code/link | `/{slug}/card/{code}` |

---

## 4. Features

### 4.1 Owner Dashboard (`/dashboard`)

| Area | What it does |
|------|--------------|
| **Overview** | KPIs (clients, scans, rewards, fraud), setup checklist, QR hub, interactive product tutorial |
| **Analytics** | Tabs: Overview, Sales, Workers leaderboard, Clients leaderboard; line/bar charts (30/90/365 day) |
| **Clients** | Search, status filter, pagination, block/unblock, CSV export, individual client profiles |
| **Scans** | Paginated scan log, fraud highlighting, CSV export |
| **Fraud** | Review blocked scans, add notes, CSV export |
| **Rewards** | Pending / redeemed / all filter, manual redeem |
| **Products** | CRUD with SKU, category, price, active toggle — feeds the worker scan flow |
| **Workers** | Create / edit / deactivate / delete workers, worker QR, employee login link (plan-limited) |
| **Card Editor** (`/dashboard/ccard`) | Live preview, logo & background upload, colors, stamp threshold, milestones, templates, AI designer |
| **Integrations** | WhatsApp / email tutorials _(currently locked)_ |
| **Billing** | Plan comparison, Chargily checkout, BaridiMob receipt upload, usage limits, history |
| **Settings** | Currency, timezone, client language, password change, account deletion |
| **Onboarding** | 4-step wizard: Identité → Carte → Sécurité → Prêt |

### 4.2 Worker App (`/worker`)

- **Home** — today's scan count + navigation
- **Scan** — camera QR scan (html5-qrcode), purchase flow, product selection, reward redemption
- **History** — today's scans
- **My QR** — worker's personal QR token

### 4.3 Customer / Public Pages

- **Find shop** (`/client`) — enter a slug to reach a shop
- **Enrol** (`/{slug}/client`) — name + phone enrolment, or look up an existing 6-digit card
- **Card** (`/{slug}/card/{code}`) — digital loyalty card: stamp progress, milestones, pending reward, share/save
- **Reward claim** (`/reward/:id`) — reward QR for staff redemption + celebration animation

### 4.4 Platform Super-Admin (`/platform`)

| Page | Purpose |
|------|---------|
| **Overview** | Global KPIs, signups/scans charts, pending receipts alert |
| **Businesses** | Search/filter/export all shops; per-tenant detail with plan override, suspend, extend trial, reset onboarding, delete |
| **Subscriptions** | All subscription records, Chargily IDs, CSV export |
| **Payments** | Approve/reject BaridiMob receipts (bulk approve, preview) |
| **Analytics** | Extended platform analytics |
| **Alerts** | Trial expiring, stale receipts, inactive tenants |
| **Settings** | Bank details, support email, maintenance mode, audit log |

---

## 5. Pricing & Plans

Defined in `src/lib/pricing.ts` and seeded in the `plans` table.

### Plans

| Plan | Monthly (DA) | Annual (DA) | Annual saving | Trial |
|------|-------------|-------------|---------------|-------|
| **Essai gratuit** (trial) | 0 | 0 | — | 14 days |
| **Boutique** 🥉 | 2 900 | 29 000 | 5 800 DA | — |
| **Maison** 🥈 | 5 400 | 54 000 | 10 800 DA | — |
| **Prestige** 🥇 | Sur devis | Sur devis | — | — |

> Annual billing: **2 months free (10 months billed).**

### Limits per plan

| Limit | Trial | Boutique | Maison | Prestige |
|-------|-------|----------|--------|----------|
| Clients | 250 | 250 | 2 000 | Illimité |
| Workers | 3 | 3 | 15 | Illimité |
| Campaigns / month | 3 | 3 | Illimitées | Illimitées |
| Locations | 1 | 1 | 3 | Illimité |

### Capabilities

| Feature | Trial | Boutique | Maison | Prestige |
|---------|-------|----------|--------|----------|
| AI Card Builder | ✗ | ✗ | ✓ | ✓ |
| Card templates | ✗ | ✗ | ✓ | ✓ |
| Exclusive templates | ✗ | ✗ | ✗ | ✓ |
| Custom card background | ✗ | ✗ | ✓ | ✓ |
| WhatsApp | ✗ | ✗ | ✓ | ✓ |
| API access | ✗ | ✗ | ✗ | ✓ |

### Support tiers

| Plan | Support | Response |
|------|---------|----------|
| Trial / Boutique | Email | 72h business |
| Maison | Priority email | 24h business |
| Prestige | Dedicated (direct WhatsApp) | < 4h |

### Add-ons

| Add-on | Price |
|--------|-------|
| Extension clients (+250) | 900 DA/month |
| Extension workers (+3) | 600 DA/month |
| Extension campaigns (+5/month) | 500 DA/month |
| WhatsApp Business setup | 2 500 DA one-time |
| Custom card design | 3 500 DA one-time |
| Guided onboarding | 4 900 DA one-time |
| Worker training (1h video) | 2 900 DA one-time |
| CSV migration | 3 500 DA one-time |
| Additional location | 1 500 DA/month |

---

## 6. Tech Stack

### Core

| Layer | Technology |
|-------|------------|
| Frontend | **React 19** + **TypeScript** |
| Build tool | **Vite 8** |
| Routing | **wouter** |
| Backend / DB | **Supabase** (Postgres, Auth, Storage, Edge Functions) |
| Data fetching | **TanStack React Query 5** |
| Forms / validation | **react-hook-form** + **zod** |
| Styling | **Tailwind CSS 4** |
| Animation | **framer-motion** |
| Charts | **recharts** |

### UI & domain libraries

- **Radix UI** (primary dashboard components), **@heroui/react** (some pages)
- **lucide-react** (icons), **class-variance-authority**, **clsx**, **tailwind-merge**, **next-themes**
- **cmdk**, **vaul**, **embla-carousel-react**, **input-otp**, **react-day-picker**
- **qrcode.react** (QR generation), **html5-qrcode** (worker scanning), **html2canvas** (card capture/share)

---

## 7. Architecture & Multi-Tenancy

Each shop is a **tenant** row in the `tenants` table with a unique **`slug`** used in public URLs.

### Slug rules

- Auto-generated from the business name via `slugify()` (lowercase, accents stripped, max 48 chars).
- Collisions get a random suffix.
- **Reserved slugs** (`src/lib/reserved-slugs.ts`): `admin`, `api`, `app`, `card`, `client`, `dashboard`, `employee`, `platform`, `shop`, `signup`, `worker`, etc.

### URL patterns

```
https://domain/{slug}/client          → customer enrolment
https://domain/{slug}/employee        → worker login
https://domain/{slug}/card/{code}     → customer's digital card (6-digit code)
```

### Tenant context

`src/lib/tenant-context.tsx` — `TenantProvider` loads the current tenant for authenticated non-super-admin users and exposes `tenant`, `trialStatus`, `slug`, `onboardingComplete`, `dashboardTutorialComplete`. Data comes from `profiles.tenant_id` → `tenants` + the `get_trial_status` RPC.

### Data isolation

- Every business table has a `tenant_id` foreign key.
- **Row Level Security (RLS)** enforces tenant scoping via `get_my_tenant_id()`.
- Super-admin bypasses via `is_super_admin()`.
- Public read is allowed on `shop_settings`, `tenants` (slug lookup), and `plans`.

---

## 8. Database

### Migrations (run in order)

| File | Purpose |
|------|---------|
| `001_saas_complete.sql` | Full schema: plans, tenants, subscriptions, payment_receipts, platform_settings, shop_settings, profiles, clients, products, scan_logs, scan_products, rewards, campaigns; RPCs; RLS; storage buckets (`tenant-assets` public, `payment-receipts` private) |
| `002_platform_admin.sql` | Platform RPCs: `get_platform_overview`, `get_platform_tenants`, `get_platform_tenant_detail` |
| `004_platform_analytics_complete.sql` | Extended KPIs, indexes, `get_platform_analytics` |
| `005_platform_admin_complete.sql` | `platform_audit_log`, `get_platform_alerts`, extended `platform_settings`, audit logging |

### Core tables

| Table | Role |
|-------|------|
| `plans` | Plan definitions + `features_json` |
| `tenants` | Shop tenant: slug, plan, trial/subscription dates, onboarding flags |
| `shop_settings` | Per-tenant config: branding, stamp rules, WhatsApp/email tokens, language |
| `profiles` | Users: owner / worker / super_admin, linked to tenant |
| `clients` | Loyalty customers: 6-digit `card_code`, stamps, phone |
| `products` | Product catalog for scan attribution |
| `scan_logs` | All scans (approved, fraud, limit) |
| `scan_products` | Products linked to scans |
| `rewards` | Earned / redeemed rewards |
| `campaigns` | Email / WhatsApp campaigns (schema only) |
| `subscriptions` | Chargily checkout records |
| `payment_receipts` | Manual payment proofs |
| `platform_settings` | Global bank details, maintenance |
| `platform_audit_log` | Super-admin action log |

### Key RPCs

- `check_plan_limits(tenant_id, check)` — checks `enrol_client`, `add_worker`, `tenant_scans_today`
- `get_trial_status(tenant_id)` — plan info + days remaining
- `get_tenant_by_slug(slug)` — public tenant branding
- `get_client_card_by_token(token, tenant_id?)` — public card data
- `is_super_admin()`, `get_my_tenant_id()`, `get_my_role()` — auth helpers

---

## 9. Edge Functions (Backend API)

Deployed via `npm run deploy:functions`.

| Function | JWT | Purpose |
|----------|-----|---------|
| `register-tenant` | OFF | SaaS signup: create tenant, shop_settings, owner user, 14-day trial |
| `enrol-client` | OFF | Customer enrolment by slug; client limit check; returns 6-digit card code |
| `login-client` | OFF | Customer login |
| `create-worker` | ON | Add worker (worker limit) |
| `purchase-scan` | ON | Worker scans client QR; fraud checks; stamp logic; optional product pending |
| `confirm-purchase-scan` | ON | Confirm product selection on pending scan |
| `redeem-reward` | ON | Worker redeems reward via reward QR |
| `create-chargily-checkout` | ON | Create Chargily Pay checkout |
| `chargily-webhook` | OFF | Handle `checkout.paid` → activate subscription |
| `submit-payment-receipt` | ON | Owner uploads BaridiMob/CCP receipt |
| `review-payment-receipt` | ON | Super-admin approve/reject receipt → activate plan |
| `cancel-subscription` | ON | Owner cancels renewal |
| `delete-tenant-account` | ON | Owner deletes shop + all data (password + slug confirm) |
| `override-tenant-plan` | ON | Super-admin manual plan override |
| `platform-tenant-action` | ON | Super-admin: suspend, extend trial, reset onboarding, cancel, delete |
| `ai-card-design` | ON | Optional server-side Groq proxy |

Shared helper: `supabase/functions/_shared/plan-limits.ts`.

---

## 10. Billing & Payments

Two payment channels:

### A. Chargily Pay (online)

1. Owner selects a plan on `/dashboard/billing`.
2. `create-chargily-checkout` creates a pending `subscriptions` row and calls the Chargily API with metadata (`subscription_id`, `tenant_id`, `plan_id`).
3. Owner is redirected to the Chargily checkout.
4. On payment, `chargily-webhook` activates the subscription, updates the tenant plan, and sets `subscription_ends_at`.

Secrets: `CHARGILY_API_KEY`, `CHARGILY_WEBHOOK_SECRET`, `APP_URL`.

### B. BaridiMob / manual transfer

1. Owner sees bank details from `platform_settings.bank_details`.
2. Uploads a receipt image to the `payment-receipts` storage bucket.
3. `submit-payment-receipt` creates a `payment_receipts` row (`pending`).
4. Super-admin reviews at `/platform/payments`.
5. `review-payment-receipt` approval activates the plan for the period.

Payment methods: `baridimob`, `ccp`, `cib`, `cash`.

### Statuses

- **Tenant:** `trialing`, `active`, `past_due`, `canceled`, `expired`
- **Subscription:** `pending`, `active`, `canceled`, `failed`
- **Receipt:** `pending`, `approved`, `rejected`

### Billing UI

- `PlanLimitsCard` — usage vs limits (clients, workers, campaigns, locations, scans/day)
- `SidebarTrialStatus` — trial countdown in the sidebar
- Plan comparison cards with Chargily button + receipt upload

---

## 11. AI Card Designer

A plan-gated feature (**Maison+**) that generates loyalty card colors and an optional SVG background from a natural-language French prompt.

- **Primary path (client-side):** `src/lib/card-ai-groq.ts` calls the **Groq API** directly using model **`llama-3.3-70b-versatile`**. Returns `primaryColor`, `secondaryColor`, `backgroundSvg`, `designSummary`, `suggestedRewardValue`. SVG output is sanitized (blocks scripts/iframes/external URLs, ~12KB max).
- **Optional server path:** `supabase/functions/ai-card-design/` mirrors the logic as an authenticated proxy.
- **UI:** `src/components/fidelity/ai-card-designer.tsx`, embedded in the card editor sidebar. The user describes a style (8–1200 chars), colors apply to the card, and if the plan allows a custom background, the SVG uploads to `tenant-assets`.

Example prompt: _"Café parisien élégant, noir et doré, ambiance premium."_

Gating helpers (`src/lib/branding-limits.ts`): `canUseAiCardBuilder`, `canCustomCardBackground` (Maison/Prestige only). On Boutique/Trial, the AI applies colors only.

---

## 12. Branding & White-Label

### Platform white-label (SaaS reseller layer)

`src/lib/platform.ts` — env-driven defaults: name **Carta**, primary `#1A56DB`, secondary `#0E9F6E`, support `support@mycarta.dz`. Used on the marketing site, auth pages, and PWA manifest. Hook: `usePlatformBranding()`.

### Shop white-label (per tenant)

Stored in `shop_settings` + `tenants`: `business_name`, `logo_url`, `card_template_url`, `primary_color`, `secondary_color`, `card_design_id`, `client_language` (fr/en). Hook: `useShopBranding(slug?)` merges tenant settings with platform defaults.

### Card templates

`src/lib/card-templates.ts` — 20+ templates across categories (classique, moderne, ludique, premium). Configurable stamp style (circle, hex, star…), layout (classic, glass, dark…), and progress style. Some are `prestigeOnly`. Default: `classic`.

### Card editor

Logo + background upload to Supabase Storage, color pickers with auto-extract from logo, stamp threshold, max scans/day, reward value, milestone labels, plan-gated template picker and AI designer, and a live client preview (`FidelityCardPreview`).

---

## 13. Anti-Fraud System

Implemented in the `purchase-scan` edge function and surfaced in the dashboard Fraud page.

| Rule | Reason code | Description |
|------|-------------|-------------|
| Blocked client | `blocked` | Owner blocked the client |
| Self-scan | `self_scan` | Worker email matches client email |
| Rapid scan | `rapid_scan` | Any scan within 60 seconds |
| Daily limit | `daily_limit` | Exceeds `max_scans_per_day` (default 2) |
| Same worker too soon | `too_soon` | Same worker scanned same client within 5 min |

Blocked scans are logged as `blocked_fraud` or `blocked_limit` and reviewable at `/dashboard/fraud`.

---

## 14. Routes Map

| Area | Route |
|------|-------|
| Landing | `/` |
| Pricing | `/tarifs` → `/#pricing` |
| Owner login / signup | `/shop` (`?tab=signup`) |
| Find shop (clients) | `/client` |
| Per-tenant enrol | `/{slug}/client` |
| Per-tenant card | `/{slug}/card/{code}` |
| Per-tenant worker login | `/{slug}/employee` |
| Owner dashboard | `/dashboard` |
| Onboarding wizard | `/dashboard/onboarding` |
| Billing | `/dashboard/billing` |
| Card editor | `/dashboard/ccard` |
| Worker app | `/worker` |
| Super-admin | `/platform` |

---

## 15. Environment & Deployment

### Environment variables (`.env`)

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
GROQ_API_KEY=gsk_your_groq_key            # AI card designer

# Optional platform white-label
# VITE_PLATFORM_NAME=Carta
# VITE_PLATFORM_TAGLINE=...
# VITE_PLATFORM_LOGO_URL=...
# VITE_PLATFORM_PRIMARY_COLOR=#1A56DB
# VITE_PLATFORM_SECONDARY_COLOR=#0E9F6E
# VITE_PLATFORM_SUPPORT_EMAIL=support@mycarta.dz
```

### Edge function secrets (Supabase Dashboard)

```
CHARGILY_API_KEY=
CHARGILY_WEBHOOK_SECRET=
APP_URL=https://your-domain.com
PLATFORM_BANK_DETAILS=Virement CCP — RIP ...
```

### Commands

```bash
npm install              # install dependencies
npm run dev              # local dev (http://localhost:5173)
npm run build            # production build
npm run deploy:functions # deploy all Supabase edge functions
```

Supabase project ref: `qealyijgeosyvmfpojzq`. 

**Full schema (empty project):** run `supabase/mycarta_full_schema.sql` once in the SQL Editor.

**Incremental:** migrations in `supabase/migrations/` in numeric order; catch-up for existing DBs: `017_carta_schema_catchup.sql`.

---

## 16. Roadmap / Not Yet Shipped

These exist in the schema/pricing but are not fully wired into the owner UI:

- **Campaigns** — `campaigns` table + plan limits exist and marketing promises WhatsApp/email campaigns, but there is **no `/dashboard/campaigns` route** yet.
- **Integrations page** — present but **locked** (`INTEGRATIONS_LOCKED = true`); WhatsApp/email fields in `shop_settings` aren't editable in the UI yet.
- **Location limits** — defined in pricing but not enforced in backend checks (usage hardcoded to 1).
- **API access** — a Prestige capability; tied to the locked integrations page.
- **Migrations 004 / 005** are required for the full platform console (analytics, alerts); the UI shows migration error banners if they're missing.

---

_Document generated for the Carta SaaS platform. Confidential — internal use._
