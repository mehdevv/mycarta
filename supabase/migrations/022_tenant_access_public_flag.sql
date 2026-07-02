-- Expose subscription access state on public tenant lookup (client portal)

CREATE OR REPLACE FUNCTION public.get_tenant_by_slug(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_settings shop_settings%ROWTYPE;
  v_access_allowed BOOLEAN;
BEGIN
  SELECT * INTO v_tenant FROM tenants WHERE slug = lower(trim(p_slug));
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_settings FROM shop_settings WHERE tenant_id = v_tenant.id;

  SELECT is_access_allowed INTO v_access_allowed
  FROM get_tenant_plan(v_tenant.id);

  RETURN jsonb_build_object(
    'id', v_tenant.id,
    'slug', v_tenant.slug,
    'name', v_tenant.name,
    'logoUrl', v_tenant.logo_url,
    'brandColor', v_tenant.brand_color,
    'businessName', COALESCE(v_settings.business_name, v_tenant.name),
    'primaryColor', COALESCE(v_settings.primary_color, v_tenant.brand_color),
    'secondaryColor', COALESCE(v_settings.secondary_color, '#0E9F6E'),
    'clientLanguage', COALESCE(v_settings.client_language, 'fr'),
    'isAccessAllowed', COALESCE(v_access_allowed, false)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_by_slug(TEXT) TO anon, authenticated;
