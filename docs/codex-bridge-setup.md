# Codex Bridge 部署说明

1. 在妙搭后端配置 `GUANJIE_BRIDGE_TOKEN`，在本机 `tools/codex-bridge/.env` 配置同一个值。
2. 填写 API 域名、Bridge ID 和允许运行的项目根目录。
3. 在项目驾驶舱中为项目配置本地仓库绝对路径；Bridge 会校验路径必须位于项目根目录下。
4. 在 `tools/codex-bridge` 中执行 `pnpm install && pnpm run health`。
5. 执行 `pnpm start`，或用 macOS LaunchAgent / systemd 将该命令设为长驻服务。

## 状态流转

1. 管理员点击“继续执行”，后端创建 `pending` 作业。
2. Bridge 原子领取为 `claimed`，启动时改为 `running`。
3. Bridge 优先使用项目保存的 thread ID 恢复会话，否则新建 thread。
4. Codex 返回结构化状态，Bridge 上报事件，后端根据任务状态重算进度。
5. 成功或失败都会结束该作业；需要人工确认的任务保持 `waiting_approval`。

未配置 token、token 不匹配、项目路径越界或状态不合法时，API 会返回明确错误，前端不能直接伪造 Bridge 事件。
