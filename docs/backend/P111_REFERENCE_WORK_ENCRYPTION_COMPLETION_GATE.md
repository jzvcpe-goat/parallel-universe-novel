# P111 Reference Work Encryption Completion Gate

Status: active gate  
Boundary: Reference Work Privacy Boundary + Public Projection Boundary  
Date: 2026-06-19

## Goal

This gate closes the loop engineering objective for representative-work privacy.
Kernel and constraint materials may be derived from private research, but public
users, GitHub visitors, non-team operators and ordinary runtime clients must
never see representative work names, author names, plaintext mappings, provider
prompt plumbing or decryptable source evidence.

P111 does not replace the older privacy gates. It proves they agree:

- `GENRE_CONSTRAINT_RULES.md` and `GENRE_KERNEL_RULES.md` expose only anonymous
  `rwref_*` references.
- `genre-runtime-rules.v1.json` declares
  `privacy.representativeWorks = encrypted_vault_only`.
- `reference-work-public-refs.json` exposes only `{ "id": "rwref_0000" }`.
- `reference-work-vault.enc.json` contains AES-256-GCM ciphertext only.
- local/team decryption uses `REFERENCE_WORK_VAULT_KEY` outside the public repo.
- release artifacts are redacted and never include representative names or
  decrypted mappings.

## Command

```bash
npm run check:reference-work-encryption-completion
```

The command writes a redacted artifact:

```text
artifacts/runtime/reference-work-encryption-completion-*.json
```

The artifact may include counts, checked paths and gate names. It must not
include representative work titles, author names, decrypted `rwref_*` mappings,
vault keys, provider prompts or raw runtime state.

## Acceptance Table

| Area | Checked | Issue Found | Fix Applied | Gate |
| ---- | ------- | ----------- | ----------- | ---- |
| Kernel docs | `GENRE_KERNEL_RULES.md` uses anonymous refs only | No | None | `scan:p4-rule-source`, `check:reference-work-encryption-completion` |
| Constraint docs | `GENRE_CONSTRAINT_RULES.md` uses anonymous refs only | No | None | `scan:p4-rule-source`, `check:reference-work-encryption-completion` |
| Runtime registry | privacy contract and `sourceRefs` match public refs | No | None | `check:p4-document-core`, `check:reference-work-encryption-completion` |
| Public refs | only anonymous IDs are visible | No | None | `check:reference-vault-access` |
| Encrypted vault | ciphertext only; no `refs`, `titles`, `works`, `authors` fields | No | None | `check:reference-vault-access`, `scan:reference-privacy` |
| Public API/UI/artifacts | no representative names, source mappings, ids or prompt plumbing | No | None | `check:public-projection-privacy`, `scan:reference-privacy` |
| Git/release evidence | root test and Pages gates include privacy scans | No | None | `npm run test`, Pages workflow |

## Invariants

1. `rwref_*` is a public anonymous pointer, not a name.
2. Plain names can exist only in team-only decrypted memory or private local
   files outside the public repository.
3. CI must not require the vault key to pass public release gates.
4. When a team key is available locally, scans may decrypt for leak detection,
   but reports must still be redacted.
5. No public client receives `sourceRefs`, `profile.id`, `kernel.id`, provider
   prompt plumbing or decrypted source evidence.

## Follow-Up Loop

After P111 passes, the next engineering loop should move to the strongest
remaining release blocker rather than adding another privacy layer: remote live
runtime assignment and runtime health evidence are still the release path that
turns the product from public-safe preview into live backend operation.
