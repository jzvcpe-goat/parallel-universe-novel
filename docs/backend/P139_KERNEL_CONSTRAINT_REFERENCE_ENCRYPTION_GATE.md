# P139 Kernel Constraint Reference Encryption Gate

## Goal

Close the legal-risk loop for the exact files that define the product's
genre brain:

- `docs/product/rules/GENRE_CONSTRAINT_RULES.md`
- `docs/product/rules/GENRE_KERNEL_RULES.md`
- `docs/product/rules/genre-runtime-rules.v1.json`

These files may say that a profile or kernel was derived from private research,
but they must never expose representative work titles, authors, source-evidence
labels, plaintext mappings, or any reversible mapping from `rwref_*` to a real
work. Public users, GitHub visitors, non-team operators, browser clients and
ordinary release artifacts may only see anonymous `rwref_*` IDs and encrypted
vault ciphertext.

## Boundary

| Area | Allowed | Forbidden |
| --- | --- | --- |
| Constraint docs | Anonymous `rwref_0000` IDs, public genre labels, reusable rules | Work titles, author names, source-evidence labels, plaintext mappings |
| Kernel docs | Anonymous `rwref_0000` IDs, public pacing and structure rules | Work titles, author names, direct benchmark labels |
| Runtime registry | `privacy.representativeWorks=encrypted_vault_only`, `sourceRefs` with public IDs | `workTitle`, `authorName`, decrypted mappings, provider prompt evidence |
| Public refs | `{ "id": "rwref_0000" }` only | titles, authors, platform names, source tags |
| Encrypted vault | AES-256-GCM ciphertext, IV, tag and ref count | plaintext `refs`, `works`, `titles`, `authors`, `mappings` |

## Gate

```bash
npm run check:kernel-constraint-reference-encryption
```

The gate:

1. verifies every `sourceRefs` value in kernel, constraint and runtime files is
   anonymous and exists in `reference-work-public-refs.json`;
2. verifies the public refs file exposes IDs only;
3. verifies the encrypted vault has no plaintext representative-work fields;
4. verifies root `npm run test` contains this gate;
5. verifies the P139 doc and development notes describe the gate;
6. when `REFERENCE_WORK_VAULT_KEY` or the local private key file is available,
   decrypts the vault in memory and scans only kernel/constraint/runtime files
   for exact title/author needles without printing the values.

## Evidence

The script writes a redacted artifact:

```text
artifacts/runtime/kernel-constraint-reference-encryption-*.json
```

The artifact must keep these redaction flags false:

- `representativeNamesIncluded`
- `authorNamesIncluded`
- `decryptedMappingsIncluded`
- `sourceRefMappingsIncluded`
- `keyValuesIncluded`
- `violationDetailsIncluded`

## Acceptance Table

| Area | Checked | Issue Found | Fix Applied | Gate |
| --- | --- | --- | --- | --- |
| `GENRE_CONSTRAINT_RULES.md` | Source refs are anonymous and public-safe | No | None | `check:kernel-constraint-reference-encryption` |
| `GENRE_KERNEL_RULES.md` | Source refs are anonymous and public-safe | No | None | `check:kernel-constraint-reference-encryption` |
| Runtime registry | `encrypted_vault_only`; source refs exist in public refs | No | None | `check:kernel-constraint-reference-encryption` |
| Public refs | IDs only, no title or author metadata | No | None | `check:kernel-constraint-reference-encryption` |
| Encrypted vault | Ciphertext only; no plaintext mapping fields | No | None | `check:kernel-constraint-reference-encryption` |
| Release chain | Root test and Pages privacy scan include the gate | No | None | `npm run test` |

## Maintenance Rule

P139 is narrower than P111/P127 on purpose. P111 proves representative-work
encryption completion; P127 proves custody across the release chain. P139 proves
the product's core rules themselves are clean. Do not remove P139 just because a
broader privacy scan is green.
