# P127 Representative Work Custody Gate

Status: active gate  
Boundary: Reference Work Privacy Boundary + Public Projection Boundary + Release Evidence Boundary  
Date: 2026-06-19

## Goal

P111 proves representative work names are encrypted and replaced by anonymous
`rwref_*` pointers. P127 keeps that proof from becoming a one-time assertion.
It checks that constraints, kernels, runtime registry, public refs, encrypted
vault, privacy artifacts, Pages workflow and handoff docs all agree on the same
custody rule:

Plain representative work names are team-only material. Public users, GitHub
visitors, non-team operators, ordinary runtime clients and downloadable release
artifacts must not see those names, author names, plaintext mappings, source ref
mappings, provider prompt plumbing or vault key material.

## Command

```bash
npm run check:representative-work-custody
```

The command writes a redacted artifact:

```text
artifacts/runtime/representative-work-custody-*.json
```

## Custody Model

| Layer | Allowed | Forbidden |
| --- | --- | --- |
| `GENRE_CONSTRAINT_RULES.md` | anonymous `rwref_*` only | representative titles, authors, `workTitle`, `authorName`, plaintext mappings |
| `GENRE_KERNEL_RULES.md` | anonymous `rwref_*` only | representative titles, authors, source evidence labels |
| `genre-runtime-rules.v1.json` | `sourceRefs` using known `rwref_*` ids | `profile.id`, `kernel.id` or refs in public projection |
| `reference-work-public-refs.json` | `{ "id": "rwref_0000" }` only | title, author, source label, provenance |
| `reference-work-vault.enc.json` | AES-256-GCM metadata and ciphertext | plaintext `refs`, `titles`, `works`, `authors`, mappings |
| Pages artifacts | redacted counts and pass/fail evidence | decrypted names, mappings, keys, provider payloads |

## Acceptance Table

| Area | Checked | Issue Found | Fix Applied | Gate |
| ---- | ------- | ----------- | ----------- | ---- |
| Constraint rules | No title markers or representative metadata fields; refs are anonymous | No | None | `check:representative-work-custody` |
| Kernel rules | No title markers or source evidence labels; refs are anonymous | No | None | `check:representative-work-custody` |
| Runtime registry | privacy is `encrypted_vault_only`; runtime refs exist in public refs | No | None | `check:reference-work-encryption-completion`, `check:representative-work-custody` |
| Public refs | only anonymous ids are visible | No | None | `check:reference-vault-access`, `check:representative-work-custody` |
| Encrypted vault | ciphertext only; key remains outside the repository | No | None | `scan:reference-privacy`, `check:representative-work-custody` |
| Release artifacts | P80, Public Projection, P111 and P127 artifacts stay redacted | No | None | `check:public-privacy-artifacts` |
| Pages workflow | P111/P127 are generated after built privacy scan and uploaded as downloadable evidence | No | None | `check:pages-live-release-gate`, `check:ci-artifact-content-coverage` |

## Root Order

Root `npm run test` must preserve this order:

```text
scan:reference-privacy
check:reference-work-encryption-completion
check:representative-work-custody
check:public-privacy-artifacts
```

This ensures P127 reads fresh P80/P111 evidence before P92 validates the
downloadable privacy artifact bundle.

## What This Does Not Do

- It does not decrypt or print the representative work vault.
- It does not grant non-team access to source mappings.
- It does not provide legal advice.
- It does not unblock remote live runtime assignment.

## Next Loop

After P127 passes, the loop should return to the strongest remaining external
release blocker: operator-provided remote service assignment, HTTPS origins,
provider-side secret-store confirmation and health evidence.
