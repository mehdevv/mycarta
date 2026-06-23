# Deploy ALL Supabase Edge Functions in one command.
#
# Prerequisites:
#   1. Access token from the account that OWNS project dunmzwligaqhrpoeagap:
#      https://supabase.com/dashboard/account/tokens
#   2. Set env var:  $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
#   3. Run:          npm run deploy:functions
#
# Optional secrets (Dashboard → Edge Functions → Secrets):
#   CHARGILY_API_KEY, CHARGILY_WEBHOOK_SECRET, GROQ_API_KEY, APP_URL, PLATFORM_BANK_DETAILS

$ErrorActionPreference = "Stop"

$ProjectRef = "dunmzwligaqhrpoeagap"
$Root = Split-Path -Parent $PSScriptRoot

Set-Location $Root

if (-not $env:SUPABASE_ACCESS_TOKEN) {
    Write-Host ""
    Write-Host "ERROR: SUPABASE_ACCESS_TOKEN is not set." -ForegroundColor Red
    Write-Host ""
    Write-Host "Use a token from the Supabase account that owns project $ProjectRef"
    Write-Host "1. Open https://supabase.com/dashboard/account/tokens"
    Write-Host "2. Create a token, then run:"
    Write-Host '   $env:SUPABASE_ACCESS_TOKEN = "sbp_your_token_here"'
    Write-Host "3. Run again: npm run deploy:functions"
    Write-Host ""
    exit 1
}

$Functions = @(
    "register-tenant",
    "enrol-client",
    "login-client",
    "login-worker",
    "create-worker",
    "update-worker-password",
    "purchase-scan",
    "confirm-purchase-scan",
    "redeem-reward",
    "create-chargily-checkout",
    "cancel-subscription",
    "delete-tenant-account",
    "chargily-webhook",
    "submit-payment-receipt",
    "review-payment-receipt",
    "override-tenant-plan",
    "platform-tenant-action",
    "ai-card-design"
)

Write-Host ""
Write-Host "Deploying $($Functions.Count) edge functions to $ProjectRef ..." -ForegroundColor Cyan
Write-Host "(JWT settings for public endpoints are in supabase/config.toml)"
Write-Host ""

$failed = @()
$succeeded = @()

foreach ($name in $Functions) {
    Write-Host "-> $name" -ForegroundColor Yellow
    npx --yes supabase@latest functions deploy $name --project-ref $ProjectRef --use-api
    if ($LASTEXITCODE -ne 0) {
        $failed += $name
        Write-Host "   FAILED: $name" -ForegroundColor Red
    } else {
        $succeeded += $name
        Write-Host "   OK: $name" -ForegroundColor Green
    }
}

Write-Host ""
if ($failed.Count -eq 0) {
    Write-Host "All edge functions deployed successfully." -ForegroundColor Green
} else {
    Write-Host "Deployed: $($succeeded.Count) / $($Functions.Count)" -ForegroundColor Yellow
    Write-Host "Failed: $($failed -join ', ')" -ForegroundColor Red
    if ($succeeded.Count -eq 0) {
        Write-Host ""
        Write-Host "If you see 403, the access token is from a different Supabase account." -ForegroundColor Red
        Write-Host "Log in with the owner of https://supabase.com/dashboard/project/$ProjectRef"
    }
    exit 1
}

Write-Host "Base URL: https://$ProjectRef.supabase.co/functions/v1/{function-name}"
Write-Host ""
