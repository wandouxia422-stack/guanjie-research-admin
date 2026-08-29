# 观界调研总后台 V1.1 建设审计与实施计划

## 建设边界

- 在现有 `guanjie-research-admin` 应用内增量升级，不新建独立应用。
- 保留 V1 的真实项目、正式资源与已排除旧链接，不删除旧字段、不改写已核验数据。
- 本版只建设“项目驾驶舱 + Codex 进度同步”管理能力，不代替策划师判断，不自动推进品牌研究状态。
- 进度只由后端依据已完成任务权重计算；前端与 Hook 都不能直接写进度。

## 现有资产审计

- 仓库：`wandouxia422-stack/guanjie-research-admin`，V1.0.0 为当前可回退基线。
- 当前应用：飞书妙搭 `app_17d0f8y5qkg`，继续使用现有前后端模块。
- 真实项目：`liuxintu-brand-2026`（流心兔品牌全案）；已有阶段快照保持不变。
- 正式资源：流心兔企业信息汇总、流心兔真实用户访谈、观界客户需求与报价管理系统。
- 排除资源：两个 OpenAI Sites 旧部署仅保留备份记录，不混入正式入口。

## 数据与迁移

- 新增 `migrations/0002_project_cockpit.sql`，对 `research_project` 只做加列。
- 新增项目任务、Codex 事件、继续执行作业、Bridge 心跳、可编辑任务模板表。
- 新表包含妙搭审计列、RLS 与标准策略；JSONB 列增加类型注释。
- 内置可复用“品牌全案”六阶段模板，总权重 100，新建项目时复制为项目任务；不向旧项目自动填充未确认的研究进度。

## 后端与安全

- 保留 V1 `overview/projects/resources` 接口，为新功能增加 cockpit、tasks、approval、timeline、events、jobs、heartbeat 端点。
- 用户端写操作继续要求飞书登录；Bridge 端点使用环境变量 token 验证，不向前端暴露。
- `event_id` 全局唯一，重放事件不重复更新；作业领取使用原子状态条件，防止重复 claim。
- 需要人工确认的任务只能先进入 `waiting_approval`，再由登录用户批准为 `done`。

## 前端与 Bridge

- 项目卡增加进度、Codex 状态、当前阶段/任务、下一步、阻塞、待确认数、最近同步和 Bridge 在线状态。
- 项目详情展示阶段任务、权重、交付物、时间线、阻塞与人工确认，并提供“继续执行”入口。
- `tools/codex-bridge/` 作为独立 Node 工具，心跳、轮询作业、恢复//新建 Codex thread，并上报结构化事件。
- Hook 只上报会话事件，项目代码来自非敏感的 `.guanjie/project.json`。

## 验收与提交策略

- 单测覆盖进度、待确认、幂等事件、阻塞显示、Bridge 离线、原子 claim、V1 数据可读和模板建项。
- 必跑 `npm run test -- --runInBand`、`npm run type:check`、`npm run lint`、`npm run build:prod`。
- 提交 1：数据库、任务/进度、驾驶舱 UI、事件接收。
- 提交 2：Bridge、Hooks、继续执行队列、文档与收尾测试。
- 只推送功能分支并创建 PR，不合并 `main`，不自动发布妙搭生产版本。
