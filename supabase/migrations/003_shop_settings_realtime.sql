-- Enable realtime sync for shop_settings (dashboard ↔ DB)
ALTER PUBLICATION supabase_realtime ADD TABLE shop_settings;
