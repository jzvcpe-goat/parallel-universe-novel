# UI Copy Dictionary

Use product language in Reader and Creator. Engineering terms belong in docs and logs, not the product interface.

| Avoid | Use |
| --- | --- |
| AI / 模型 / LLM | Describe the author action; do not expose model setup |
| API key | Never collect or display in product UI |
| Provider | Never expose as a Local Workspace setting |
| 后端 | 作品记录 / 发布记录 |
| 数据库 | 作品记录 / 发布记录 |
| 接口 | 保存 / 发布 / 更新状态 |
| 回写 | 保存 / 发布 / 更新状态 |
| 同步 | 刷新 / 更新状态 / 读取新请求 |
| trace | 发布记录 |
| fallback | 暂时不可用 |
| Supabase / RLS | Never show in UI |
| preview / 预览版 | 内测版 / 当前版本 |
| system prompt / raw hash | Never show in UI |
| 发布检查（新增或过渡文案） | 发布包 / 发布包确认；兼容路由标题等待 IA cutover |

Tone:

- Reader copy: literary, direct, low-friction.
- Creator copy: professional, operational, local-first.
- Errors: say what the author can do next.
