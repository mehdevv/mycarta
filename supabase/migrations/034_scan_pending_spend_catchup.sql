-- Catch-up for spend-based pending scan flow (confirm-purchase-scan)

ALTER TABLE scan_logs
  ADD COLUMN IF NOT EXISTS purchase_amount_dzd INT,
  ADD COLUMN IF NOT EXISTS spend_added_dzd INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_amount BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pending_stamps BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS current_cycle_spend_dzd INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spend_dzd BIGINT NOT NULL DEFAULT 0;

ALTER TABLE shop_settings
  ADD COLUMN IF NOT EXISTS spend_threshold_dzd INT NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS stamps_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS spend_enabled BOOLEAN NOT NULL DEFAULT false;
