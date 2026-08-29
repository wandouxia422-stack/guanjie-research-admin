BEGIN;

ALTER TABLE research_project
  ADD COLUMN IF NOT EXISTS progress_percent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS codex_status varchar(50) NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS current_stage varchar(200),
  ADD COLUMN IF NOT EXISTS current_task varchar(300),
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS blocker text,
  ADD COLUMN IF NOT EXISTS codex_thread_id varchar(200),
  ADD COLUMN IF NOT EXISTS repo_full_name varchar(300),
  ADD COLUMN IF NOT EXISTS repo_local_path text,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP(3) WITH TIME ZONE,
  ADD CONSTRAINT research_project_progress_range
    CHECK (progress_percent BETWEEN 0 AND 100);

CREATE TABLE IF NOT EXISTS project_task_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code varchar(100) NOT NULL UNIQUE,
  name varchar(200) NOT NULL,
  category varchar(100) NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  _created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by user_profile DEFAULT (CASE WHEN current_setting('app.user_id', TRUE) = '' THEN NULL ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile END),
  _updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by user_profile DEFAULT (CASE WHEN current_setting('app.user_id', TRUE) = '' THEN NULL ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile END)
);

CREATE TABLE IF NOT EXISTS project_task_template_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES project_task_template(id),
  task_code varchar(100) NOT NULL,
  stage_code varchar(100) NOT NULL,
  stage_name varchar(200) NOT NULL,
  title varchar(300) NOT NULL,
  description text,
  weight integer NOT NULL CHECK (weight > 0 AND weight <= 100),
  requires_approval boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  _created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by user_profile DEFAULT (CASE WHEN current_setting('app.user_id', TRUE) = '' THEN NULL ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile END),
  _updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by user_profile DEFAULT (CASE WHEN current_setting('app.user_id', TRUE) = '' THEN NULL ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile END),
  UNIQUE(template_id, task_code)
);

CREATE TABLE IF NOT EXISTS project_task (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES research_project(id),
  task_code varchar(100) NOT NULL,
  stage_code varchar(100) NOT NULL,
  stage_name varchar(200) NOT NULL,
  title varchar(300) NOT NULL,
  description text,
  weight integer NOT NULL CHECK (weight > 0 AND weight <= 100),
  status varchar(40) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','running','waiting_approval','blocked','done')),
  requires_approval boolean NOT NULL DEFAULT false,
  deliverables jsonb NOT NULL DEFAULT '[]'::jsonb,
  completion_summary text,
  blocker text,
  sort_order integer NOT NULL DEFAULT 0,
  started_at TIMESTAMP(3) WITH TIME ZONE,
  completed_at TIMESTAMP(3) WITH TIME ZONE,
  _created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by user_profile DEFAULT (CASE WHEN current_setting('app.user_id', TRUE) = '' THEN NULL ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile END),
  _updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by user_profile DEFAULT (CASE WHEN current_setting('app.user_id', TRUE) = '' THEN NULL ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile END),
  UNIQUE(project_id, task_code)
);
COMMENT ON COLUMN project_task.deliverables IS '@type string[]';

CREATE TABLE IF NOT EXISTS codex_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id varchar(200) NOT NULL UNIQUE,
  project_id uuid NOT NULL REFERENCES research_project(id),
  project_code varchar(100) NOT NULL,
  thread_id varchar(200),
  task_code varchar(100),
  event_type varchar(50) NOT NULL CHECK (event_type IN ('run_started','task_started','task_completed','waiting_approval','blocked','run_paused','run_failed','run_completed')),
  summary text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMP(3) WITH TIME ZONE NOT NULL,
  _created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by user_profile DEFAULT (CASE WHEN current_setting('app.user_id', TRUE) = '' THEN NULL ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile END),
  _updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by user_profile DEFAULT (CASE WHEN current_setting('app.user_id', TRUE) = '' THEN NULL ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile END)
);
COMMENT ON COLUMN codex_event.payload IS '@type Record<string, unknown>';

CREATE TABLE IF NOT EXISTS codex_job (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES research_project(id),
  action varchar(100) NOT NULL,
  status varchar(40) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','claimed','running','completed','failed','cancelled')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  bridge_id varchar(200),
  claimed_at TIMESTAMP(3) WITH TIME ZONE,
  completed_at TIMESTAMP(3) WITH TIME ZONE,
  error_message text,
  _created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by user_profile DEFAULT (CASE WHEN current_setting('app.user_id', TRUE) = '' THEN NULL ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile END),
  _updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by user_profile DEFAULT (CASE WHEN current_setting('app.user_id', TRUE) = '' THEN NULL ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile END)
);
COMMENT ON COLUMN codex_job.payload IS '@type Record<string, unknown>';

CREATE TABLE IF NOT EXISTS codex_bridge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bridge_id varchar(200) NOT NULL UNIQUE,
  status varchar(30) NOT NULL DEFAULT 'online',
  project_root text,
  last_heartbeat_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by user_profile DEFAULT (CASE WHEN current_setting('app.user_id', TRUE) = '' THEN NULL ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile END),
  _updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by user_profile DEFAULT (CASE WHEN current_setting('app.user_id', TRUE) = '' THEN NULL ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile END)
);

CREATE INDEX IF NOT EXISTS idx_project_task_project ON project_task(project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_project_task_status ON project_task(project_id, status);
CREATE INDEX IF NOT EXISTS idx_codex_event_project ON codex_event(project_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_codex_job_pending ON codex_job(status, _created_at);
CREATE INDEX IF NOT EXISTS idx_template_item_order ON project_task_template_item(template_id, sort_order);

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['project_task_template','project_task_template_item','project_task','codex_event','codex_job','codex_bridge']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY service_role_bypass_policy ON %I TO service_role USING (true)', table_name);
    EXECUTE format('CREATE POLICY "修改全部数据" ON %I AS PERMISSIVE FOR ALL TO authenticated USING (true)', table_name);
    EXECUTE format('CREATE POLICY "查看全部数据" ON %I AS PERMISSIVE FOR SELECT TO authenticated, anon USING (true)', table_name);
    EXECUTE format('CREATE POLICY "修改本人数据" ON %I AS PERMISSIVE FOR ALL TO authenticated USING ((current_setting(''app.user_id''::text) = ANY (ARRAY[]::text[])) AND (current_setting(''app.user_id''::text) = ((_created_by).user_id)::text))', table_name);
  END LOOP;
END $$;

INSERT INTO project_task_template (template_code, name, category, description)
VALUES ('brand-full-case-v1', '品牌全案', '品牌全案', '观界品牌全案六阶段默认任务模板，可在建项前编辑。')
ON CONFLICT (template_code) DO NOTHING;

INSERT INTO project_task_template_item
  (template_id, task_code, stage_code, stage_name, title, description, weight, requires_approval, sort_order)
SELECT t.id, v.task_code, v.stage_code, v.stage_name, v.title, v.description, v.weight, v.requires_approval, v.sort_order
FROM project_task_template t
CROSS JOIN (VALUES
  ('intake-facts','intake','01 企业基础调研','整理企业事实底稿','汇总已提供企业资料并标注缺失与冲突。',5,false,10),
  ('intake-confirm','intake','01 企业基础调研','确认企业基础调研','由项目负责人确认基础事实底稿。',5,true,20),
  ('market-research','research','02 市场与需求研究','完成行业与市场研究','验证类别规模、结构、变化与趋势。',7,false,30),
  ('competitor-research','research','02 市场与需求研究','完成竞争与竞品研究','确认真实竞争边界与竞争空位假设。',6,false,40),
  ('demand-research','research','02 市场与需求研究','完成用户与需求研究','整理公开声音、内部观察与真实访谈。',7,true,50),
  ('advantage-research','diagnosis','03 优势与机会诊断','完成企业优势研究','验证可重复能力与客户价值证据。',10,false,60),
  ('opportunity-diagnosis','diagnosis','03 优势与机会诊断','完成战略机会诊断','交叉验证机会并形成 TOP3 建议。',15,true,70),
  ('brand-strategy','strategy','04 品牌战略与体系','完成品牌战略','形成战场、客户、价值、竞争与边界选择。',13,true,80),
  ('brand-system','strategy','04 品牌战略与体系','完成品牌体系','将已确认战略转化为叙事、识别与语言系统。',12,true,90),
  ('product-pricing','execution','05 产品渠道与传播','完成产品与价格战略','建立产品架构、SKU 角色、价格带与价值证明。',7,true,100),
  ('channel-comms','execution','05 产品渠道与传播','完成渠道与传播策略','建立决策路径、渠道优先级与传播信息架构。',8,true,110),
  ('validation-90d','validation','06 90 天落地验证','制定最小经营单元与 90 天计划','把已确认战略压缩为可成交、可交付、可复盘的闭环。',5,true,120)
) AS v(task_code,stage_code,stage_name,title,description,weight,requires_approval,sort_order)
WHERE t.template_code = 'brand-full-case-v1'
ON CONFLICT (template_id, task_code) DO NOTHING;

COMMIT;
