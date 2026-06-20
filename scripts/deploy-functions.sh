#!/usr/bin/env bash
# Deploy ALL Supabase Edge Functions in one command.
# Usage: SUPABASE_ACCESS_TOKEN=sbp_... npm run deploy:functions

set -euo pipefail

PROJECT_REF="qealyijgeosyvmfpojzq"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo ""
  echo "ERROR: SUPABASE_ACCESS_TOKEN is not set."
  echo "Get a token: https://supabase.com/dashboard/account/tokens"
  echo 'Then: export SUPABASE_ACCESS_TOKEN="sbp_..."'
  echo "Run: npm run deploy:functions"
  echo ""
  exit 1
fi

echo ""
echo "Deploying all edge functions to project ${PROJECT_REF} ..."
echo ""

npx --yes supabase@latest functions deploy --project-ref "$PROJECT_REF" --use-api

echo ""
echo "All edge functions deployed successfully."
echo "Base URL: https://${PROJECT_REF}.supabase.co/functions/v1/{function-name}"
echo ""
