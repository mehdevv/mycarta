-- Per-tenant product catalog: auto-set tenant_id on insert and block cross-tenant writes.

CREATE OR REPLACE FUNCTION public.products_set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := get_my_tenant_id();
  END IF;

  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id is required';
  END IF;

  IF NOT is_super_admin() AND NEW.tenant_id IS DISTINCT FROM get_my_tenant_id() THEN
    RAISE EXCEPTION 'Cannot create product for another tenant';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_set_tenant ON products;
CREATE TRIGGER products_set_tenant
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION products_set_tenant_id();
