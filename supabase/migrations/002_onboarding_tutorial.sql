-- Add dashboard tutorial completion flag for owner first-visit tour
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS dashboard_tutorial_complete BOOLEAN NOT NULL DEFAULT false;
