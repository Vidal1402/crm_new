-- Metas por funil e passos de playbook. Só a sessão autenticada do tenant lê e grava.
SET search_path TO whatsapp_hub, public;

CREATE TABLE IF NOT EXISTS whatsapp_hub.pipeline_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES whatsapp_hub.tenants(id),
  pipeline_id uuid NOT NULL REFERENCES whatsapp_hub.pipelines(id) ON DELETE CASCADE,
  month date NOT NULL,
  target_count integer NOT NULL DEFAULT 0 CHECK (target_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pipeline_id, month)
);

CREATE TABLE IF NOT EXISTS whatsapp_hub.playbook_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES whatsapp_hub.tenants(id),
  pipeline_id uuid NOT NULL REFERENCES whatsapp_hub.pipelines(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE whatsapp_hub.pipeline_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_hub.playbook_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pipeline_goals_tenant_select ON whatsapp_hub.pipeline_goals;
CREATE POLICY pipeline_goals_tenant_select ON whatsapp_hub.pipeline_goals
  FOR SELECT TO authenticated
  USING (tenant_id = whatsapp_hub.current_tenant_id());

DROP POLICY IF EXISTS pipeline_goals_tenant_write ON whatsapp_hub.pipeline_goals;
CREATE POLICY pipeline_goals_tenant_write ON whatsapp_hub.pipeline_goals
  FOR ALL TO authenticated
  USING (
    tenant_id = whatsapp_hub.current_tenant_id()
    AND whatsapp_hub.current_user_role() IN ('admin', 'operator')
  )
  WITH CHECK (
    tenant_id = whatsapp_hub.current_tenant_id()
    AND whatsapp_hub.current_user_role() IN ('admin', 'operator')
  );

DROP POLICY IF EXISTS playbook_steps_tenant_select ON whatsapp_hub.playbook_steps;
CREATE POLICY playbook_steps_tenant_select ON whatsapp_hub.playbook_steps
  FOR SELECT TO authenticated
  USING (tenant_id = whatsapp_hub.current_tenant_id());

DROP POLICY IF EXISTS playbook_steps_tenant_write ON whatsapp_hub.playbook_steps;
CREATE POLICY playbook_steps_tenant_write ON whatsapp_hub.playbook_steps
  FOR ALL TO authenticated
  USING (
    tenant_id = whatsapp_hub.current_tenant_id()
    AND whatsapp_hub.current_user_role() IN ('admin', 'operator')
  )
  WITH CHECK (
    tenant_id = whatsapp_hub.current_tenant_id()
    AND whatsapp_hub.current_user_role() IN ('admin', 'operator')
  );

REVOKE ALL ON whatsapp_hub.pipeline_goals FROM PUBLIC, anon;
REVOKE ALL ON whatsapp_hub.playbook_steps FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_hub.pipeline_goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_hub.playbook_steps TO authenticated;
