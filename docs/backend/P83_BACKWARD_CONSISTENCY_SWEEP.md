# P83 Backward Consistency Sweep

Status: active gate  
Boundary: Public Projection Boundary + Reference Work Privacy Boundary + Deprecated Case Logic Guard  
Date: 2026-06-18

## Purpose

Public Projection Privacy Audit closed the forward-facing leak path. This sweep checks the older P4, reference privacy, sourceRefs, and deprecated-case gates against the new boundary so old assumptions do not drift back into the product.

This is intentionally not a refactor. It is a consistency pass across rule docs, runtime registry, public projection, fixtures, scan scripts, root test, CI evidence, and handoff notes.

## Acceptance Table

| Area | Checked | Issue Found | Fix Applied | Gate |
| ---- | ------- | ----------- | ----------- | ---- |
| `GENRE_CONSTRAINT_RULES.md` | Docs table and profile sections use anonymous `rwref_*`; no representative titles | No | None | `npm run scan:p4-rule-source`, `npm run scan:reference-privacy` |
| `GENRE_KERNEL_RULES.md` | Kernel table and kernel sections use the same anonymous refs as runtime registry | No | None | `npm run scan:p4-rule-source`, `npm run scan:reference-privacy` |
| `genre-runtime-rules.v1.json` | `privacy.representativeWorks=encrypted_vault_only`; source refs anonymous; deprecated case policy purged | No | None | `npm run check:p4-document-core`, `npm run scan:p4-rule-source` |
| Backend projection / FastAPI response | Internal session keeps audit facts; public projection removes ids, refs, provider/prompt plumbing | No | None | `node scripts/run-backend-python.mjs -m pytest backend/tests/test_creator_dialogue_api.py`, `npm run check:public-projection-privacy` |
| Creator Studio / Reader UI public output | Public UI scans block runtime/debug fields and public build scan checks generated `dist` | No | None | `npm run scan:public-ui-boundary`, `npm run check:public-projection-privacy` |
| Quality Brake fixtures | Fixture surfaces remain redacted and are included in redacted artifact scanning | No | None | `npm run check:public-projection-privacy`, `npm run scan:reference-privacy` |
| Reference-work vault / public refs | Vault is AES-256-GCM, public refs expose ids only, CI does not own default decryptability | No | None | `npm run check:reference-vault-access`, `npm run scan:reference-privacy` |
| Existing scan scripts and root test chain | Root `npm run test` includes P4, sourceRefs drift, public projection, backward consistency, reference privacy, public privacy artifact content and remote assignment artifact content gates | Yes: deployed smoke script still used old `prompt_id` contract; Pages did not upload public projection privacy artifact separately; P43 artifact evidence doc still said twelve artifacts after the workflow required thirteen; assignment schema/execution/fixture artifacts had metadata evidence before P93 but not content attestation | Replaced old deployed-smoke request context with `guide_id`; added `public-projection-privacy` Pages artifact and current-run artifact gate; updated P43 artifact count to thirteen; added P92 privacy artifact content attestation; added P93 assignment artifact content attestation | `npm run check:backward-consistency-sweep`, `npm run test` |
| Development notes / handoff docs | Notes and handoff docs describe the same boundaries as implementation | Yes: no dedicated backward sweep handoff existed | Added this P83 handoff and development note entry | `npm run check:backward-consistency-sweep` |

## Required Commands

```bash
npm run check:p4-document-core
npm run check:p4-deprecated-case-logic
npm run scan:p4-rule-source
npm run check:reference-vault-access
npm run scan:reference-privacy
npm run check:public-projection-privacy
npm run check:public-privacy-artifacts
npm run check:remote-assignment-artifacts
npm run check:backward-consistency-sweep
npm run test
```

## Invariants

1. Human docs and runtime registry may use anonymous `sourceRefs`; public API, UI, preview build, logs and ordinary artifacts may not.
2. Representative work names, author names and plaintext mappings belong only in the encrypted vault and local/team-only decrypted memory.
3. Deprecated case logic is a guardrail, not executable product logic.
4. Public projection is story-facing; internal session state may retain audit facts only behind projection.
5. New privacy gates must be part of root `npm run test` or Pages/release CI, not only manual commands.
