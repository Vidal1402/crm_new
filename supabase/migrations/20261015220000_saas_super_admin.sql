-- Super Admin de produção: tabela própria, JWT exclusivo, papéis de tenant
-- (admin/operator) separados do papel da plataforma.

SET search_path TO whatsapp_hub, public;

CREATE TABLE IF NOT EXISTS whatsapp_hub.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE whatsapp_hub.platform_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_admins_self ON whatsapp_hub.platform_admins;
CREATE POLICY platform_admins_self ON whatsapp_hub.platform_admins
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin', false));

CREATE OR REPLACE FUNCTION whatsapp_hub.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = whatsapp_hub, public
AS $$
  SELECT
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin', false)
    OR EXISTS (
      SELECT 1 FROM whatsapp_hub.platform_admins p WHERE p.user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION whatsapp_hub.is_platform_operator()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT whatsapp_hub.is_super_admin();
$$;

-- No CRM do cliente o papel efetivo é tenant_role (admin/operator).
-- Super Admin guarda role=super_admin e, se também opera um tenant, tenant_role.
CREATE OR REPLACE FUNCTION whatsapp_hub.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'tenant_role', ''),
    CASE
      WHEN auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'operator')
        THEN auth.jwt() -> 'app_metadata' ->> 'role'
      ELSE NULL
    END
  );
$$;

GRANT EXECUTE ON FUNCTION whatsapp_hub.is_super_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION whatsapp_hub.is_platform_operator() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION whatsapp_hub.current_user_role() TO anon, authenticated, service_role;

-- Primeiro admin do tenant megacrm vira Super Admin (continua admin desse CRM).
INSERT INTO whatsapp_hub.platform_admins (user_id, email)
SELECT au.user_id, COALESCE(u.email, '')
FROM whatsapp_hub.app_users au
JOIN auth.users u ON u.id = au.user_id
WHERE au.role = 'admin'
  AND au.tenant_id = (SELECT id FROM whatsapp_hub.tenants WHERE slug = 'megacrm' LIMIT 1)
ORDER BY au.accepted_at NULLS LAST, au.user_id
LIMIT 1
ON CONFLICT (user_id) DO NOTHING;

UPDATE auth.users u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'role', 'super_admin',
    'tenant_role', COALESCE(au.role::text, 'admin'),
    'tenant_id', au.tenant_id::text
  )
FROM whatsapp_hub.platform_admins p
JOIN whatsapp_hub.app_users au ON au.user_id = p.user_id
WHERE u.id = p.user_id;

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
  v_invited_role := NEW.raw_user_meta_data->>'invited_role';

  IF v_invited_role = 'super_admin' THEN
    INSERT INTO whatsapp_hub.platform_admins (user_id, email)
    VALUES (NEW.id, COALESCE(NEW.email, ''))
    ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;

    UPDATE auth.users
       SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
                             || jsonb_build_object('role', 'super_admin')
     WHERE id = NEW.id;

    RETURN NEW;
  END IF;

  v_tenant := NULLIF(NEW.raw_user_meta_data->>'invited_to_tenant', '')::uuid;
  IF v_tenant IS NULL THEN
    SELECT id INTO v_tenant FROM whatsapp_hub.tenants WHERE slug = 'megacrm';
  END IF;

  SELECT COUNT(*) INTO v_user_count FROM whatsapp_hub.app_users WHERE tenant_id = v_tenant;

  IF v_user_count = 0 THEN
    v_role := 'admin';
  ELSIF v_invited_role IN ('admin', 'operator') THEN
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
                           || jsonb_build_object(
                             'role', v_role::text,
                             'tenant_role', v_role::text,
                             'tenant_id', v_tenant::text
                           )
   WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION whatsapp_hub.handle_new_user() FROM PUBLIC, authenticated, anon;
