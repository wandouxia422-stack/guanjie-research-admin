# Codex Bridge

这是与妙搭主应用解耦的本地长驻进程。它只领取管理后台中明确创建的“继续执行”作业，不会从问卷数量或 Hook 次数推测研究进度。

## 启动

```bash
cd tools/codex-bridge
cp .env.example .env
pnpm install
pnpm run health
pnpm start
```

环境变量：

- `GUANJIE_API_BASE`：观界调研总后台的可访问域名。
- `GUANJIE_BRIDGE_TOKEN`：仅服务端与 Bridge 保存的长随机密钥，不得写入 Git。
- `GUANJIE_BRIDGE_ID`：这台 Bridge 的稳定名称。
- `GUANJIE_PROJECT_ROOT`：允许 Codex 操作的项目根目录；后台配置越出该目录时会被拒绝。

Bridge 离线时，未领取作业保持 `pending`，不会被标记为失败。运行日志只记录作业与错误摘要，不输出 token 或 Codex 内部推理。
