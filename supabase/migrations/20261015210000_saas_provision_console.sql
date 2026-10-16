-- Console SaaS: planos comerciais no tenant, operador da plataforma e
-- workspace inicial (funil) ao criar um CRM de cliente.

SET search_path TO whatsapp_hub, public;

INSERT INTO whatsapp_hub.saas_plans (id, name, is_baseline) VALUES
  ('inicial', 'Inicial', true),
  ('intermediario', 'Intermediário', false),
  ('avancado', 'Avançado', false)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_baseline = EXCLUDED.is_baseline;

UPDATE whatsapp_hub.tenant_subscriptions
SET plan_id = 'inicial'
WHERE plan_id = 'basico';

ALTER TABLE whatsapp_hub.tenants
  ADD COLUMN IF NOT EXISTS owner_email text;

CREATE OR REPLACE FUNCTION whatsapp_hub.is_platform_operator()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin', false)
    OR (
      COALESCE(auth.jwt() -> 'app_metadata' ->> 'role' = 'admin', false)
      AND NULLIF(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '')::uuid
        IS NOT DISTINCT FROM (
          SELECT t.id FROM whatsapp_hub.tenants t WHERE t.slug = 'megacrm' LIMIT 1
        )
    );
$$;

GRANT EXECUTE ON FUNCTION whatsapp_hub.is_platform_operator() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS tenants_self_select ON whatsapp_hub.tenants;
CREATE POLICY tenants_self_select ON whatsapp_hub.tenants
  FOR SELECT TO authenticated
  USING (id = whatsapp_hub.current_tenant_id() OR whatsapp_hub.is_platform_operator());

DROP POLICY IF EXISTS tenant_subs_self ON whatsapp_hub.tenant_subscriptions;
CREATE POLICY tenant_subs_self ON whatsapp_hub.tenant_subscriptions
  FOR SELECT TO authenticated
  USING (tenant_id = whatsapp_hub.current_tenant_id() OR whatsapp_hub.is_platform_operator());

CREATE OR REPLACE FUNCTION whatsapp_hub.seed_tenant_workspace(p_tenant uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = whatsapp_hub, public, pg_temp
AS $$
DECLARE
  pid uuid;
BEGIN
  IF p_tenant IS NULL THEN
    RAISE EXCEPTION 'tenant ausente';
  END IF;
  IF EXISTS (SELECT 1 FROM whatsapp_hub.pipelines WHERE tenant_id = p_tenant) THEN
    RETURN;
  END IF;

  INSERT INTO whatsapp_hub.pipelines (name, kind, position, is_default, tenant_id)
  VALUES ('Comercial', 'comercial', 0, true, p_tenant)
  RETURNING id INTO pid;

  INSERT INTO whatsapp_hub.stages (pipeline_id, name, position, is_won, is_lost, tenant_id) VALUES
    (pid, 'Novo lead',   0, false, false, p_tenant),
    (pid, 'Qualificado', 1, false, false, p_tenant),
    (pid, 'Proposta',    2, false, false, p_tenant),
    (pid, 'Negociação',  3, false, false, p_tenant),
    (pid, 'Ganho',       4, true,  false, p_tenant),
    (pid, 'Perdido',     5, false, true,  p_tenant);
END;
$$;

REVOKE ALL ON FUNCTION whatsapp_hub.seed_tenant_workspace(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION whatsapp_hub.seed_tenant_workspace(uuid) TO service_role;

CREATE OR REPLACE FUNCTION whatsapp_hub.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = whatsapp_hub, public, pg_temp
AS $$
DECLARE
  v_user_count   int;
  v_invited_role text;
  v_role         whatsapp_hub.tenant_role;
  v_tenant       uuid;
  v_plan         whatsapp_hub.commercial_plan;
BEGIN
  v_tenant := NULLIF(NEW.raw_user_meta_data->>'invited_to_tenant', '')::uuid;
  IF v_tenant IS NULL THEN
    SELECT id INTO v_tenant FROM whatsapp_hub.tenants WHERE slug = 'megacrm';
  END IF;

  SELECT COUNT(*) INTO v_user_count FROM whatsapp_hub.app_users WHERE tenant_id = v_tenant;

  IF v_user_count = 0 THEN
    v_role := 'admin';
  ELSIF NEW.raw_user_meta_data ? 'invited_role'
        AND (NEW.raw_user_meta_data->>'invited_role') IN ('admin', 'operator') THEN
    v_invited_role := NEW.raw_user_meta_data->>'invited_role';
    v_role := v_invited_role::whatsapp_hub.tenant_role;
  ELSE
    RAISE EXCEPTION 'Self-signup desabilitado. Solicite um convite ao owner desta instância.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT CASE s.plan_id
    WHEN 'intermediario' THEN 'intermediario'::whatsapp_hub.commercial_plan
    WHEN 'avancado' THEN 'avancado'::whatsapp_hub.commercial_plan
    ELSE 'inicial'::whatsapp_hub.commercial_plan
  END
  INTO v_plan
  FROM whatsapp_hub.tenant_subscriptions s
  WHERE s.tenant_id = v_tenant;

  INSERT INTO whatsapp_hub.app_users (user_id, role, accepted_at, tenant_id, commercial_plan)
  VALUES (NEW.id, v_role, now(), v_tenant, COALESCE(v_plan, 'inicial'))
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE auth.users
     SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
                           || jsonb_build_object('role', v_role::text, 'tenant_id', v_tenant::text)
   WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION whatsapp_hub.handle_new_user() FROM PUBLIC, authenticated, anon;
