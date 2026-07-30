# Contributing To Parallel Universe Novel

This repository is preparing an MVP codebase for shared maintenance. The public Reader and the localhost-only Creator are separate products with separate data boundaries.

## Start Here

1. Read `AGENTS.md` and the relevant feature-level contracts before editing.
2. Run `npm install` and `npm --prefix app install`.
3. For Creator work, start with `npm run test:creator` rather than the full remote-runtime suite.
4. Keep unpublished draft prose, local workspace exports, `.env*`, `artifacts/`, and `backups/` out of commits.

## Ownership Boundaries

| Area | Primary scope | Do not do without owner review |
| --- | --- | --- |
| Creator writing quality | `app/src/features/creator-decision`, `app/src/apps/creator`, `app/src/local-db` | Auto-adopt prose, modify Canon, enable automatic retrieval, access Chapter 21+ evidence |
| Creator UI | `app/src/components/creator`, Creator routes, existing primitives | Add page-local CSS, raw product colors, Reader visual motifs |
| Reader | `app/src/components/reader`, Reader routes | Add generation or expose Creator/private-draft state |
| Retrieval | `app/src/integrations/creator-rag` | Implement a custom RAG, vector store, embedding, reranker, or silently enable automatic retrieval |
| Cloud database / payment | `deploy/supabase`, payment and entitlement owners | Include schema, RLS, payment, or production changes in a Creator-only PR |

## Required PR Evidence

- State the user-facing behavior and the unchanged boundaries.
- Add or update a focused test for domain behavior.
- Run `npm --prefix app run lint`, `npm run check:pivot`, and the smallest relevant checks.
- Run `npm run check:no-custom-rag` when recall, context, or long-form memory changes.
- Do not claim stable literary improvement without a frozen, evidence-located comparison protocol and human-review evidence.

## Branch And Review Rules

- Use one bounded workstream per branch and PR.
- Do not mix database/payment changes with Creator local-writing changes.
- Preserve unrelated working-tree changes; use explicit file paths when staging.
- High-risk actions require author confirmation: candidate adoption, Canon commit, publication, workspace import replacement, and any destructive local cleanup.
- Prefer a draft PR until the relevant checks and privacy scan pass.

## MVP Status

The MVP repository proves local Creator workflows, author confirmation boundaries, and bounded evidence receipts. It does not yet claim production payment, deployment readiness, automatic RAG, or stable literary-quality improvement.
