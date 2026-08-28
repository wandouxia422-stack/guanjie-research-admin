BEGIN;

CREATE TABLE IF NOT EXISTS research_project (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code varchar(100) NOT NULL UNIQUE,
  name varchar(200) NOT NULL,
  client_name varchar(200),
  category varchar(100) NOT NULL DEFAULT '品牌全案',
  stage_snapshot varchar(200) NOT NULL DEFAULT '待确认',
  project_status varchar(50) NOT NULL DEFAULT 'active',
  status_note text,
  research_locked boolean NOT NULL DEFAULT true,
  archived boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  _created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by user_profile DEFAULT (
    CASE
      WHEN current_setting('app.user_id', TRUE) = '' THEN NULL
      ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile
    END
  ),
  _updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by user_profile DEFAULT (
    CASE
      WHEN current_setting('app.user_id', TRUE) = '' THEN NULL
      ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile
    END
  )
);

ALTER TABLE research_project ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_bypass_policy ON research_project
  TO service_role USING (true);
CREATE POLICY "修改全部数据" ON research_project
  AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY "查看全部数据" ON research_project
  AS PERMISSIVE FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "修改本人数据" ON research_project
  AS PERMISSIVE FOR ALL TO authenticated USING (
    (current_setting('app.user_id'::text) = ANY (ARRAY[]::text[]))
    AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text)
  );

CREATE INDEX IF NOT EXISTS idx_research_project_status
  ON research_project(project_status, archived, sort_order);

CREATE TABLE IF NOT EXISTS resource_entry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_code varchar(120) NOT NULL UNIQUE,
  project_id uuid REFERENCES research_project(id),
  title varchar(200) NOT NULL,
  resource_type varchar(80) NOT NULL,
  app_id varchar(100),
  public_url text NOT NULL,
  admin_url text,
  lifecycle varchar(50) NOT NULL DEFAULT 'active',
  verified boolean NOT NULL DEFAULT false,
  verification_note text,
  sort_order integer NOT NULL DEFAULT 0,
  _created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by user_profile DEFAULT (
    CASE
      WHEN current_setting('app.user_id', TRUE) = '' THEN NULL
      ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile
    END
  ),
  _updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by user_profile DEFAULT (
    CASE
      WHEN current_setting('app.user_id', TRUE) = '' THEN NULL
      ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile
    END
  )
);

ALTER TABLE resource_entry ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_bypass_policy ON resource_entry
  TO service_role USING (true);
CREATE POLICY "修改全部数据" ON resource_entry
  AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY "查看全部数据" ON resource_entry
  AS PERMISSIVE FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "修改本人数据" ON resource_entry
  AS PERMISSIVE FOR ALL TO authenticated USING (
    (current_setting('app.user_id'::text) = ANY (ARRAY[]::text[]))
    AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text)
  );

CREATE INDEX IF NOT EXISTS idx_resource_entry_project
  ON resource_entry(project_id, lifecycle, sort_order);

INSERT INTO research_project (
  project_code,
  name,
  client_name,
  category,
  stage_snapshot,
  project_status,
  status_note,
  research_locked,
  archived,
  sort_order
) VALUES (
  'liuxintu-brand-2026',
  '流心兔品牌全案',
  '流心兔',
  '品牌全案',
  '用户与需求研究（已核验快照）',
  'active',
  '仅展示已有状态；本后台不会自动推进品牌研究。',
  true,
  false,
  10
) ON CONFLICT (project_code) DO NOTHING;

INSERT INTO resource_entry (
  resource_code,
  project_id,
  title,
  resource_type,
  app_id,
  public_url,
  admin_url,
  lifecycle,
  verified,
  verification_note,
  sort_order
) VALUES
(
  'liuxintu-enterprise-intake',
  (SELECT id FROM research_project WHERE project_code = 'liuxintu-brand-2026'),
  '流心兔企业信息汇总',
  'enterprise_questionnaire',
  'app_17d0cygdqre',
  'https://ucnpgul5rrxg.feishuapp.com/app/app_17d0cygdqre',
  'https://ucnpgul5rrxg.feishuapp.com/app/app_17d0cygdqre/admin',
  'active',
  true,
  '2026-08-28 已核验发布、数据库表与 enterprise_admin 角色存在。',
  10
),
(
  'liuxintu-user-interview',
  (SELECT id FROM research_project WHERE project_code = 'liuxintu-brand-2026'),
  '流心兔真实用户访谈',
  'consumer_interview',
  'app_17d09awtvap',
  'https://ucnpgul5rrxg.feishuapp.com/app/app_17d09awtvap',
  'https://ucnpgul5rrxg.feishuapp.com/app/app_17d09awtvap/admin',
  'active',
  true,
  '2026-08-28 已核验发布、数据库表与 interview_admin 角色存在。',
  20
),
(
  'guanjie-quote-manager',
  NULL,
  '观界客户需求与报价管理系统',
  'shared_tool',
  'app_17ckter0fe5',
  'https://ucnpgul5rrxg.feishuapp.com/app/app_17ckter0fe5',
  'https://ucnpgul5rrxg.feishuapp.com/app/app_17ckter0fe5/admin',
  'active',
  true,
  '2026-08-28 已核验发布、数据库表与 client_manager 角色存在；它是通用工具，不计入客户项目。',
  100
),
(
  'legacy-liuxintu-interview-sites',
  (SELECT id FROM research_project WHERE project_code = 'liuxintu-brand-2026'),
  '流心兔用户访谈 OpenAI Sites 旧版',
  'legacy_page',
  NULL,
  'https://liuxintu-real-user-interview.wandouxia422.chatgpt.site/',
  NULL,
  'excluded',
  true,
  '因中国大陆访问问题仅作备份，不在正式入口中展示。',
  900
),
(
  'legacy-quote-manager-sites',
  NULL,
  '观界客户需求系统 OpenAI Sites 旧部署',
  'legacy_page',
  NULL,
  'https://guanjie-client-intake.wandouxia422.chatgpt.site/',
  'https://guanjie-client-intake.wandouxia422.chatgpt.site/admin',
  'excluded',
  true,
  '已迁移至飞书妙搭，仅作备份，不在正式入口中展示。',
  910
)
ON CONFLICT (resource_code) DO NOTHING;

COMMIT;
