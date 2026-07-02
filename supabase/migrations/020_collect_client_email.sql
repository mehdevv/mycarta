-- Owner can enable email collection on the client enrolment form

ALTER TABLE shop_settings
  ADD COLUMN IF NOT EXISTS collect_client_email BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN shop_settings.collect_client_email IS
  'When true, the public enrolment form requires an email and saves it on clients.email';
