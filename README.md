# 观界调研总后台

观界品牌咨询的调研管理中枢，用于统一汇总真实项目、企业问卷、消费者访谈、各自后台和线上页面。

## V1.0.0

- 妙搭应用 ID：`app_17d0f8y5qkg`
- 正式入口：<https://ucnpgul5rrxg.feishuapp.com/app/app_17d0f8y5qkg>
- 发布日期：2026-08-28
- 版本标签：`v1.0.0`
- 存储：飞书妙搭 PostgreSQL 持久化数据库
- 访问边界：必须飞书登录

## V1 能力

- 真实项目进度快照汇总。
- 企业问卷、消费者访谈、通用工具的前台与后台入口统一管理。
- 新增项目和新增资源入口持久化保存。
- 已核验资产与旧链接、Demo、未核验项目分离。
- 研究状态只作人工快照，不会自动推进品牌研究。

## V1.1 项目驾驶舱

- 按已完成任务权重由后端统一计算项目进度。
- 六阶段“品牌全案”默认模板，新项目可复用，关键节点需人工确认。
- 项目任务、交付物、阻塞、最近事件和 Bridge 在线状态统一展示。
- 本地 Codex Bridge 恢复会话并处理“继续执行”队列；离线时作业安全保留。

详细部署见 [`docs/codex-bridge-setup.md`](docs/codex-bridge-setup.md) 和 [`docs/codex-hook-install.md`](docs/codex-hook-install.md)。

## 首批正式资产

- 流心兔品牌全案。
- 流心兔企业信息汇总。
- 流心兔真实用户访谈。
- 观界客户需求与报价管理系统（通用工具）。

OpenAI Sites 旧部署只作排除记录，不在正式入口区展示。

## 技术架构

- React 19 + TypeScript + Vite
- NestJS + Drizzle ORM
- 飞书妙搭全栈运行时
- PostgreSQL + RLS

## 本地验证

```bash
npm run type:check
npm run lint
npm run build:prod
```

## 安全约定

- 不提交 `.env.local`、令牌、密钥或客户敏感资料。
- 不把当前样本硬编码为长期权限白名单。
- 新入口默认为待核验，经人工核对后才视为正式资产。
