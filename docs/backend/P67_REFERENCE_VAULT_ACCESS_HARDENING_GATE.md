# P67 Reference Vault Access Hardening Gate

Date: 2026-06-18

## Goal

P67 hardens the legal/privacy boundary around representative works used by
`ConstraintProfile` and `GenreKernel`. The product may keep anonymous
`rwref_*` evidence ids in public rules, but titles, authors, and source
mappings must remain encrypted and team-only.

Command:

```bash
npm run check:reference-vault-access
npm run scan:reference-privacy
```

## Decisions

The gate proves these decisions:

- `team_only_decryption`: decryption requires an out-of-repository key or a
  team-controlled secret.
- `zero_plaintext_public_refs`: public refs expose only anonymous `rwref_*`
  ids.
- `key_outside_public_repository`: local key material must stay outside this
  public release repository and must not be group/world readable.

## Public Runtime Boundary

Allowed public artifacts:

- `docs/product/rules/genre-runtime-rules.v1.json`
- `docs/product/rules/GENRE_CONSTRAINT_RULES.md`
- `docs/product/rules/GENRE_KERNEL_RULES.md`
- `docs/product/rules/reference-work-public-refs.json`
- `docs/product/rules/reference-work-vault.enc.json`

Allowed public data:

- `sourceRefs`
- `rwref_*`
- encrypted vault metadata: `version`, `algorithm`, `aad`, `keyEnv`,
  `refCount`, `iv`, `tag`, `ciphertext`

Forbidden public data:

- representative work titles,
- author names,
- source-evidence labels that can identify a work,
- plaintext mapping from `rwref_*` to a title or author,
- vault key files,
- concrete `REFERENCE_WORK_VAULT_KEY` values,
- decrypted vault payloads.

## Vault Contract

`reference-work-vault.enc.json` must use:

- `algorithm = AES-256-GCM`
- `aad = parallel-universe-reference-work-vault:v1`
- `keyEnv = REFERENCE_WORK_VAULT_KEY`
- `refCount` equal to `reference-work-public-refs.json.refCount`

The encrypted vault may be committed, but it must not contain plaintext fields
such as `refs`, `titles`, `works`, `items`, `representativeWorks`, or `authors`.

## Key Contract

The local key path is:

```text
/Users/james/Documents/PUF/private/reference-work-vault.key
```

This path must stay outside the public repository. If the key exists locally,
the gate requires:

- base64 text that decodes to 32 bytes,
- no group/other read, write, or execute permissions,
- no committed key file,
- no concrete key values in current tracked files or Git history.

CI may use `REFERENCE_WORK_VAULT_KEY` as a team secret, but the value must never
be written into GitHub repository variables, Pages variables, docs, logs,
browser output, or runtime artifacts.

## Relationship To Existing Privacy Scan

P67 complements `scan:reference-privacy`:

- `scan:reference-privacy` searches public files, current build output, runtime
  artifacts, and Git history for leaks.
- `scan:reference-privacy` emits
  `artifacts/runtime/reference-privacy-*.json` with counts, scan scope and
  pass/fail metadata only. It never writes titles, authors, decrypted mappings,
  key values or violation detail strings into the artifact.
- `check:reference-vault-access` proves the vault/key/access contract that makes
  those scans meaningful.

Both commands are required in root `npm run test`.
GitHub Pages uploads the generated privacy artifact as `reference-privacy`, and
the current-run artifact gate requires it before public deploy.

## Acceptance

1. `.gitignore` ignores `private/` and `reference-work-vault.key`.
2. `package.json` exposes `check:reference-vault-access`.
3. Root `npm run test` includes `check:reference-vault-access`.
4. Vault metadata matches the AES-GCM contract.
5. Public refs expose only `id`.
6. Runtime `ConstraintProfile` and `GenreKernel` source refs all use known
   anonymous `rwref_*` ids.
7. Local key path is outside the public repository.
8. If the local key exists, it is 32-byte AES material and not group/world
   accessible.
9. The gate artifact does not include titles, authors, decrypted mappings, or
   key values.
10. `scan:reference-privacy` writes a redacted evidence artifact and Pages CI
    uploads it as `reference-privacy`.
