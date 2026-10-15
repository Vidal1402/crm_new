-- Fase A: um tenant para o MEGACRM atual, tenant_id nas tabelas de dados,
-- JWT + RLS. Ainda não há Super Admin nem provisionamento por pagamento.
-- Aplicar no SQL Editor / db:push ANTES de usar a branch em produção.
-- Depois do deploy, cada usuário precisa sair e entrar de novo (JWT).

SET search_path TO whatsapp_hub, public;

CREATE TABLE IF NOT EXISTS whatsapp_hub.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_hub.saas_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  is_baseline boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO whatsapp_hub.saas_plans (id, name, is_baseline)
VALUES ('basico', 'Básico', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO whatsapp_hub.tenants (slug, name, status)
SELECT 'megacrm', 'MEGACRM', 'active'
WHERE NOT EXISTS (SELECT 1 FROM whatsapp_hub.tenants WHERE slug = 'megacrm');

CREATE TABLE IF NOT EXISTS whatsapp_hub.tenant_subscriptions (
  tenant_id uuid PRIMARY KEY REFERENCES whatsapp_hub.tenants(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES whatsapp_hub.saas_plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO whatsapp_hub.tenant_subscriptions (tenant_id, plan_id, status)
SELECT t.id, 'basico', 'active'
FROM whatsapp_hub.tenants t
WHERE t.slug = 'megacrm'
ON CONFLICT (tenant_id) DO NOTHING;

CREATE OR REPLACE FUNCTION whatsapp_hub.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION whatsapp_hub.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin', false);
$$;

GRANT EXECUTE ON FUNCTION whatsapp_hub.current_tenant_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION whatsapp_hub.is_super_admin() TO anon, authenticated, service_role;

-- Coluna tenant_id em todas as tabelas de dados do hub (exceto catálogo SaaS).
DO $$
DECLARE
  r record;
  tid uuid;
  skip text[] := ARRAY['tenants', 'saas_plans', 'tenant_subscriptions'];
BEGIN
  SELECT id INTO tid FROM whatsapp_hub.tenants WHERE slug = 'megacrm';
  IF tid IS NULL THEN RAISE EXCEPTION 'tenant megacrm ausente'; END IF;

  FOR r IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'whatsapp_hub'
      AND c.relkind = 'r'
      AND c.relname <> ALL (skip)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'whatsapp_hub'
        AND table_name = r.table_name
        AND column_name = 'tenant_id'
    ) THEN
      EXECUTE format(
        'ALTER TABLE whatsapp_hub.%I ADD COLUMN tenant_id uuid REFERENCES whatsapp_hub.tenants(id)',
        r.table_name
      );
    END IF;
    EXECUTE format(
      'UPDATE whatsapp_hub.%I SET tenant_id = $1 WHERE tenant_id IS NULL',
      r.table_name
    ) USING tid;
    EXECUTE format(
      'ALTER TABLE whatsapp_hub.%I ALTER COLUMN tenant_id SET NOT NULL',
      r.table_name
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON whatsapp_hub.%I (tenant_id)',
      'idx_' || r.table_name || '_tenant_id',
      r.table_name
    );
  END LOOP;
END $$;

ALTER TABLE whatsapp_hub.contacts DROP CONSTRAINT IF EXISTS contacts_phone_key;
ALTER TABLE whatsapp_hub.contacts DROP CONSTRAINT IF EXISTS contacts_tenant_id_phone_key;
ALTER TABLE whatsapp_hub.contacts
  ADD CONSTRAINT contacts_tenant_id_phone_key UNIQUE (tenant_id, phone);

ALTER TABLE whatsapp_hub.tags DROP CONSTRAINT IF EXISTS tags_name_key;
ALTER TABLE whatsapp_hub.tags DROP CONSTRAINT IF EXISTS tags_tenant_id_name_key;
ALTER TABLE whatsapp_hub.tags
  ADD CONSTRAINT tags_tenant_id_name_key UNIQUE (tenant_id, name);

ALTER TABLE whatsapp_hub.templates DROP CONSTRAINT IF EXISTS templates_name_key;
ALTER TABLE whatsapp_hub.templates DROP CONSTRAINT IF EXISTS templates_tenant_id_name_key;
ALTER TABLE whatsapp_hub.templates
  ADD CONSTRAINT templates_tenant_id_name_key UNIQUE (tenant_id, name);

-- JWT dos usuários já existentes
UPDATE auth.users u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'tenant_id', au.tenant_id::text,
    'role', au.role::text
  )
FROM whatsapp_hub.app_users au
WHERE au.user_id = u.id;

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

  INSERT INTO whatsapp_hub.app_users (user_id, role, accepted_at, tenant_id)
  VALUES (NEW.id, v_role, now(), v_tenant)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE auth.users
     SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
                           || jsonb_build_object('role', v_role::text, 'tenant_id', v_tenant::text)
   WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION whatsapp_hub.handle_new_user() FROM PUBLIC, authenticated, anon;

-- RLS: isola por tenant, mantém papéis admin/operator nas escritas conhecidas.
DO $$
DECLARE
  r record;
  p record;
BEGIN
  FOR r IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'whatsapp_hub'
      AND c.relkind = 'r'
      AND c.relname NOT IN ('tenants', 'saas_plans', 'tenant_subscriptions')
  LOOP
    FOR p IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'whatsapp_hub' AND tablename = r.table_name
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON whatsapp_hub.%I', p.policyname, r.table_name);
    END LOOP;

    EXECUTE format('ALTER TABLE whatsapp_hub.%I ENABLE ROW LEVEL SECURITY', r.table_name);

    EXECUTE format(
      'CREATE POLICY %I ON whatsapp_hub.%I FOR SELECT TO authenticated USING (tenant_id = whatsapp_hub.current_tenant_id())',
      r.table_name || '_tenant_select',
      r.table_name
    );

    IF r.table_name = 'app_users' THEN
      EXECUTE format(
        'CREATE POLICY %I ON whatsapp_hub.%I FOR ALL TO authenticated
           USING (tenant_id = whatsapp_hub.current_tenant_id() AND whatsapp_hub.current_user_role() = ''admin'')
           WITH CHECK (tenant_id = whatsapp_hub.current_tenant_id() AND whatsapp_hub.current_user_role() = ''admin'')',
        r.table_name || '_tenant_admin',
        r.table_name
      );
      EXECUTE format(
        'CREATE POLICY %I ON whatsapp_hub.%I FOR UPDATE TO authenticated
           USING (tenant_id = whatsapp_hub.current_tenant_id() AND user_id = auth.uid())
           WITH CHECK (tenant_id = whatsapp_hub.current_tenant_id() AND user_id = auth.uid())',
        r.table_name || '_self_update',
        r.table_name
      );
    ELSIF r.table_name IN ('custom_fields', 'products', 'whatsapp_channels', 'lead_assignment_queue') THEN
      EXECUTE format(
        'CREATE POLICY %I ON whatsapp_hub.%I FOR ALL TO authenticated
           USING (tenant_id = whatsapp_hub.current_tenant_id() AND whatsapp_hub.current_user_role() = ''admin'')
           WITH CHECK (tenant_id = whatsapp_hub.current_tenant_id() AND whatsapp_hub.current_user_role() = ''admin'')',
        r.table_name || '_tenant_admin_write',
        r.table_name
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON whatsapp_hub.%I FOR ALL TO authenticated
           USING (tenant_id = whatsapp_hub.current_tenant_id() AND whatsapp_hub.current_user_role() IN (''admin'',''operator''))
           WITH CHECK (tenant_id = whatsapp_hub.current_tenant_id() AND whatsapp_hub.current_user_role() IN (''admin'',''operator''))',
        r.table_name || '_tenant_write',
        r.table_name
      );
    END IF;
  END LOOP;
END $$;

ALTER TABLE whatsapp_hub.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenants_self_select ON whatsapp_hub.tenants;
CREATE POLICY tenants_self_select ON whatsapp_hub.tenants
  FOR SELECT TO authenticated
  USING (id = whatsapp_hub.current_tenant_id() OR whatsapp_hub.is_super_admin());

ALTER TABLE whatsapp_hub.saas_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS saas_plans_read ON whatsapp_hub.saas_plans;
CREATE POLICY saas_plans_read ON whatsapp_hub.saas_plans
  FOR SELECT TO authenticated USING (true);

ALTER TABLE whatsapp_hub.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_subs_self ON whatsapp_hub.tenant_subscriptions;
CREATE POLICY tenant_subs_self ON whatsapp_hub.tenant_subscriptions
  FOR SELECT TO authenticated
  USING (tenant_id = whatsapp_hub.current_tenant_id() OR whatsapp_hub.is_super_admin());

-- Ingest de WhatsApp: copia tenant_id do canal (service_role ignora RLS).
CREATE OR REPLACE FUNCTION whatsapp_hub.ingest_channel_message(
 p_channel_id uuid, p_message_id text, p_phone text, p_name text,
 p_text text, p_content_type text DEFAULT 'text', p_media_url text DEFAULT NULL,
 p_external_conversation_id text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO whatsapp_hub AS $$
DECLARE
 ch whatsapp_hub.whatsapp_channels%ROWTYPE;
 cid uuid; vid uuid; mid uuid; did uuid; sid uuid; assigned uuid;
 external_mid text; is_new boolean := false;
BEGIN
 SELECT * INTO ch FROM whatsapp_hub.whatsapp_channels WHERE id=p_channel_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Número não cadastrado'; END IF;
 IF NOT ch.enabled THEN RETURN jsonb_build_object('skipped','disabled'); END IF;
 IF p_phone IS NULL OR p_phone !~ '^\+[0-9]{6,15}$' OR NULLIF(p_message_id,'') IS NULL THEN RAISE EXCEPTION 'Mensagem inválida'; END IF;
 external_mid := CASE WHEN ch.provider='uazapi' THEN 'uazapi:'||ch.id||':'||p_message_id ELSE p_message_id END;
 SELECT id,conversation_id INTO mid,vid FROM whatsapp_hub.messages WHERE zernio_message_id=external_mid;
 IF FOUND THEN RETURN jsonb_build_object('deduped',true,'message_id',mid,'conversation_id',vid); END IF;
 INSERT INTO whatsapp_hub.contacts(phone,name,source,tenant_id) VALUES(p_phone,p_name,'whatsapp',ch.tenant_id)
 ON CONFLICT(tenant_id,phone) DO UPDATE SET name=COALESCE(whatsapp_hub.contacts.name,EXCLUDED.name) RETURNING id INTO cid;
 SELECT id,assigned_to INTO vid,assigned FROM whatsapp_hub.conversations WHERE contact_id=cid AND whatsapp_channel_id=ch.id;
 IF vid IS NULL THEN
  is_new := true;
  IF ch.assignment_mode='fixed' THEN assigned := ch.operator_id;
  ELSE
   SELECT user_id INTO assigned FROM whatsapp_hub.app_users WHERE tenant_id=ch.tenant_id AND accepted_at IS NOT NULL
    AND (ch.last_operator_id IS NULL OR user_id>ch.last_operator_id) ORDER BY user_id LIMIT 1;
   IF assigned IS NULL THEN SELECT user_id INTO assigned FROM whatsapp_hub.app_users WHERE tenant_id=ch.tenant_id AND accepted_at IS NOT NULL ORDER BY user_id LIMIT 1; END IF;
   UPDATE whatsapp_hub.whatsapp_channels SET last_operator_id=assigned WHERE id=ch.id;
  END IF;
  INSERT INTO whatsapp_hub.conversations(contact_id,whatsapp_channel_id,channel,status,ai_paused,assigned_to,assigned_at,zernio_conversation_id,last_message_at,tenant_id)
  VALUES(cid,ch.id,CASE WHEN ch.provider='uazapi' THEN 'uazapi' ELSE 'whatsapp' END,
   'human_active'::whatsapp_hub.conversation_status,
   true,assigned,now(),p_external_conversation_id,now(),ch.tenant_id) RETURNING id INTO vid;
 END IF;
 IF ch.add_to_funnel AND ch.pipeline_id IS NOT NULL THEN
  SELECT id INTO did FROM whatsapp_hub.deals WHERE contact_id=cid AND pipeline_id=ch.pipeline_id AND status='open' ORDER BY created_at DESC LIMIT 1;
  IF did IS NULL THEN
   SELECT id INTO sid FROM whatsapp_hub.stages WHERE pipeline_id=ch.pipeline_id AND NOT is_won AND NOT is_lost ORDER BY position LIMIT 1;
   IF sid IS NOT NULL THEN
    INSERT INTO whatsapp_hub.deals(contact_id,pipeline_id,stage_id,title,status,owner_id,lead_type,temperature,traffic_type,origin_channel,first_contact_at,tenant_id)
    VALUES(cid,ch.pipeline_id,sid,COALESCE(p_name,p_phone),'open',assigned,'Lead','Morno','organico','whatsapp',now(),ch.tenant_id) RETURNING id INTO did;
   END IF;
  END IF;
 END IF;
 UPDATE whatsapp_hub.conversations SET last_message_at=now(),unread_count=unread_count+1,
  zernio_conversation_id=COALESCE(p_external_conversation_id,zernio_conversation_id),
  active_deal_id=COALESCE(active_deal_id,did),
  status=CASE WHEN status='closed' THEN 'human_active'::whatsapp_hub.conversation_status ELSE status END,
  ai_paused=CASE WHEN status='closed' THEN true ELSE ai_paused END,closed_at=NULL WHERE id=vid;
 INSERT INTO whatsapp_hub.messages(conversation_id,direction,sender_type,content_type,content,media_url,zernio_message_id,is_private_note,tenant_id)
 VALUES(vid,'inbound','contact',p_content_type::whatsapp_hub.content_type,p_text,p_media_url,external_mid,false,ch.tenant_id) RETURNING id INTO mid;
 RETURN jsonb_build_object('message_id',mid,'conversation_id',vid,'new_conversation',is_new);
END; $$;

REVOKE ALL ON FUNCTION whatsapp_hub.ingest_channel_message(uuid,text,text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION whatsapp_hub.ingest_channel_message(uuid,text,text,text,text,text,text,text) TO service_role;
