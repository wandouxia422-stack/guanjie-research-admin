# Codex Hook 安装

1. 将 `tools/codex-bridge/templates/hooks.json` 中的绝对路径替换为当前仓库路径，再合并到 Codex Hook 配置。
2. 在每个被管理的项目仓库根目录创建 `.guanjie/project.json`：

```json
{
  "projectCode": "project-code-from-guanjie-admin"
}
```

3. Hook 运行环境需可读取 `GUANJIE_API_BASE` 和 `GUANJIE_BRIDGE_TOKEN`，但这两项不得写入项目 JSON 或 Git。

`SessionStart`/`PostToolUse`/`Stop`/`SessionEnd` 只上报执行事件。Hook 不计算进度，不更改品牌研究阶段，上报失败也不会中断 Codex 会话。
