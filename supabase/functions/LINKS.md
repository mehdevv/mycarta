# LoyalQR SaaS — Local & Edge Function Links

Use while developing with `npm run dev` (default: **http://localhost:5173**).

## Marketing & auth

| Page | URL |
|------|-----|
| Landing | http://localhost:5173/ |
| Pricing (DZD) | http://localhost:5173/tarifs |
| Sign up (14-day trial) | http://localhost:5173/signup |
| Shop owner login | http://localhost:5173/shop |
| Employee login | http://localhost:5173/employee |
| Find shop | http://localhost:5173/client |

## Per-tenant (replace `{slug}`)

| Page | URL |
|------|-----|
| Customer enrol | http://localhost:5173/{slug}/client |
| Digital card | http://localhost:5173/{slug}/card/{code} |

## Super-admin (SaaS owner)

| Page | URL |
|------|-----|
| Platform console | http://localhost:5173/platform |

**Access:** your `profiles.role` must be `super_admin` (not `owner` from signup).

```sql
-- Supabase SQL editor — use your login email
UPDATE profiles
SET role = 'super_admin', tenant_id = NULL
WHERE email = 'votre@email.com';
```

Then sign out and sign in again at `/shop` → redirects to `/platform`.

Also run `supabase/migrations/002_platform_admin.sql` for platform stats.

## Dashboard

| Page | URL |
|------|-----|
| Owner dashboard | http://localhost:5173/dashboard |
| Billing (Chargily / BaridiMob) | http://localhost:5173/dashboard/billing |
| Onboarding | http://localhost:5173/dashboard/onboarding |
| Super-admin console | http://localhost:5173/platform |

## Supabase migration

Run on a **new** Supabase project SQL editor:

`supabase/migrations/001_saas_complete.sql`

## Edge Functions

Base: `{VITE_SUPABASE_URL}/functions/v1/{name}`

### Deploy all at once (CLI)

1. Create an access token: [Supabase Account → Tokens](https://supabase.com/dashboard/account/tokens)
2. In PowerShell:
   ```powershell
   $env:SUPABASE_ACCESS_TOKEN = "sbp_your_token_here"
   npm run deploy:functions
   ```
3. JWT settings (`verify_jwt`) are in `supabase/config.toml` for public endpoints.

| Function | JWT | Purpose |
|----------|-----|---------|
| register-tenant | OFF | SaaS signup + trial |
| enrol-client | OFF | Customer enrol (requires `slug`) |
| login-client | OFF | Customer login |
| create-worker | ON | Add worker (plan limits) |
| purchase-scan | ON | Worker scan (plan limits) |
| confirm-purchase-scan | ON | Product confirmation |
| redeem-reward | ON | Redeem reward |
| create-chargily-checkout | ON | Chargily payment |
| cancel-subscription | ON | Owner cancels renewal |
| delete-tenant-account | ON | Owner deletes shop + data |
| chargily-webhook | OFF | Payment webhook |
| submit-payment-receipt | ON | BaridiMob receipt upload |
| review-payment-receipt | ON | Super-admin approve/reject receipt |
| override-tenant-plan | ON | Super-admin plan override |
| platform-tenant-action | ON | Super-admin suspend / extend trial / delete tenant |

### SaaS / billing (deploy if missing)

These were added with the multi-tenant migration — run `npm run deploy:functions` if not yet on your project:

`register-tenant`, `create-chargily-checkout`, `chargily-webhook`, `submit-payment-receipt`, `review-payment-receipt`, `override-tenant-plan`, `platform-tenant-action`

### Secrets (Supabase Dashboard)

- `CHARGILY_API_KEY`
- `CHARGILY_WEBHOOK_SECRET`
- `APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (auto)

Legacy `setup-owner` is superseded by `register-tenant`.
