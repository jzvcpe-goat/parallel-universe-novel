# Banned UI Terms

Scope: Reader and Creator product-facing UI. Creator documentation may mention
implementation terms when explaining guardrails, but the rendered author
workbench must use product language only.

These terms must not appear in product-facing UI copy:

- Supabase
- RLS
- trace
- provider
- fallback
- API key
- 后端
- 接口
- 同步
- 回写
- 数据库
- AI
- 模型
- LLM
- system prompt
- raw hash
- service switches
- preview
- 预览版

Script: `npm run check:ui-copy`.

Additional Creator boundary script: `npm run check:creator-product-boundary`.

The script scans UI source and generated product strings, not server code or data-access internals. If a data-access error includes these terms, the UI layer must translate it before rendering.
