# Reference Work Privacy Audit 2026-06-17

## Goal

确认 `constraints` 与 `genre kernel` 相关公开材料不暴露主流小说代表作品名称、作者名或可直接还原的作品元数据。公开侧只允许出现匿名引用 ID，例如 `rwref_0001`。

## Audited Artifacts

| Artifact | Public/Private | Requirement |
| --- | --- | --- |
| `docs/product/rules/genre-runtime-rules.v1.json` | public | Only `sourceRefs` may reference representative works. |
| `docs/product/rules/GENRE_CONSTRAINT_RULES.md` | public | No work titles, author names, or title markers. |
| `docs/product/rules/GENRE_KERNEL_RULES.md` | public | No work titles, author names, or title markers. |
| `docs/product/rules/reference-work-public-refs.json` | public | Only anonymous `id` and source PDF labels. |
| `docs/product/rules/reference-work-vault.enc.json` | private encrypted artifact | AES-GCM ciphertext only; no plaintext refs/titles/items. |

## Current Evidence

- Runtime rules contain `21` constraint profiles.
- Runtime rules contain `21` genre kernels.
- Public reference map contains `45` anonymous refs.
- Public rule artifacts contain `0` `《...》` title markers.
- Public rule artifacts expose `0` direct representative work leaks in the current scan.
- `npm run scan:reference-privacy` passes.

## Guardrail Added

`scripts/scan-reference-privacy.mjs` now fails if public rule artifacts contain:

- Chinese book-title markers like `《...》`.
- Metadata labels such as `代表作`, `代表作品`, `作品名`, `书名`, `作者名`.
- English metadata keys such as `authorName`, `workTitle`, `representativeWorkTitle`.
- Public ref objects with fields beyond `id` and `source_pdfs`.
- Runtime `sourceRefs` that are not anonymous `rwref_0000` IDs.

## Operational Rule

Do not add real representative work names to `GenreKernel`, `ConstraintProfile`, public Markdown, frontend data, or backend runtime code. If a team member needs the real mapping, use the encrypted vault with the private key outside the public repository.

## Verification Command

```bash
npm run scan:reference-privacy
```
