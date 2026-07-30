# Parallel Universe Novel Agent Rules

This repository uses Harness Engineering for product work. Inspect current code before changing it, keep Reader and Creator surfaces separate, and make each change verifiable with scripts or browser evidence.

## Current P0 Product Boundary

- Reader Web is the public reading surface.
- Creator is a localhost-only author workbench.
- Cloud storage is limited to public content, request state, and publish records.
- Draft prose stays local. Cloud records may store only a private draft reference.
- No cloud writing runtime is part of P0.
- No author credential is stored or rendered by the public app.
- All publishing requires explicit author confirmation.

## Frontend Rules

- Use shadcn/ui and existing Radix-backed primitives first.
- Put Creator-specific composition in `app/src/components/creator`.
- Use semantic CSS variables; do not hard-code product colors in business components.
- Do not use Reader depth imagery, planet art, nebula effects, particles, or concept-board remnants in Creator.
- Liquid Glass is allowed for controls, cards, rails, dialogs, and publish checks. Long-form editors and prose previews must stay quiet.
- Every key action must expose loading, success, error, and disabled states.
- Destructive or irreversible actions need a confirmation dialog.

## Creator Pivot V2 Rules

- Before Creator Pivot V2 UI work, run the existing-project slicing workflow in `docs/launch/040_LEGACY_REFINEMENT_DELETION_PLAN.md`.
- Classify every legacy owner as Preserve, Extract, Adapt, Deprecate, or Delete before reusing it.
- Execute Creator Pivot V2 in order: M0 gates, M1 local data, M2 agent action surface, M3 external echo, M4 publish bundles, then UI IA refactor.
- Do not redesign Creator pages before the relevant contract, storage, action-surface, and publish-bundle gates exist.
- Creator is a working-agent-operable localhost writing space, not a reader-request management backend.
- Treat reader requests as one input to External Echo; do not make request queues the permanent center of the Creator product.
- Treat `<legacy-integration-harness>`, PUF artifacts, `<legacy-static-ui-reference>`, and `<legacy-novel-package>` as read-only legacy/reference sources unless a slice ownership review explicitly approves reuse.
- New Creator V2 work must stay inside this PUF repository. Do not edit `<unrelated-project>` or other unrelated projects while pursuing this goal.

## RAG And Retrieval Adoption

- Do not implement a custom RAG engine, vector store, embedding runtime, text splitter, ANN search, BM25 scorer, reciprocal-rank fusion, similarity function, or reranker.
- The current right-side recall directory is an author-controlled deterministic projection. It is not a RAG implementation and must not be marketed as one.
- Automatic retrieval may enter only through a thin adapter under `app/src/integrations/creator-rag` and must follow `docs/data-contracts/creator-rag-open-source-boundary.md`.
- P0 starts local and zero-cost: community-maintained open-source packages run on the author's machine; no paid embedding API or hosted vector database is required.
- Use upstream implementations for chunking, embedding, full-text/vector search, fusion, and reranking. Product code may map DTOs, apply work/branch/chapter metadata filters, preserve source locators, and merge explicit author-selected recall items.
- Author-selected recall items are hard includes. Automatic retrieval cannot remove them, change canon, or publish content.
- Run `npm run check:no-custom-rag` after any retrieval, recall, context-compilation, or long-form memory change.

## Copy Boundary

Do not render these terms in product UI:

`Supabase`, `RLS`, `trace`, `provider`, `fallback`, `API key`, `后端`, `接口`, `同步`, `回写`, `数据库`, `AI`, `模型`, `LLM`.

Use the copy dictionary in `docs/product/ui-copy-dictionary.md`.

## Required Local Checks

Run targeted checks after Creator UI work:

```bash
npm run check:ui-copy
npm run check:design-tokens
npm run check:no-mock-data
npm run check:slicing
npm run check:pivot
npm --prefix app run lint
npm --prefix app run build:creator
```

Full `npm run test` includes remote runtime gates and may stop on non-UI deployment evidence. Report that separately from Creator UI status.
