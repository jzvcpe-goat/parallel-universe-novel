# Reference Work Vault Access Runbook

Status: active privacy gate  
Owner: product/runtime maintainers  
Scope: `ConstraintProfile`, `GenreKernel`, market research source evidence, and any representative work mapping

## Purpose

The public product may use genre structures distilled from market research, but non-team users must never see the underlying representative work titles, author names, or source evidence mapping. Public artifacts only use anonymous references such as `rwref_0013`.

## Public Repository Contract

Allowed public artifacts:

- `docs/product/rules/genre-runtime-rules.v1.json`
- `docs/product/rules/GENRE_CONSTRAINT_RULES.md`
- `docs/product/rules/GENRE_KERNEL_RULES.md`
- `docs/product/rules/reference-work-public-refs.json`
- `docs/product/rules/reference-work-vault.enc.json`

Allowed public fields:

- `sourceRefs`
- `rwref_*`
- encrypted vault metadata needed for AES-GCM decryption, such as `algorithm`, `iv`, `tag`, `aad`, `ciphertext`, and `keyEnv`

Forbidden public content:

- representative work titles
- author names
- plaintext source evidence names
- source labels or provenance maps
- decrypted vault payloads
- concrete vault key values
- local key files
- one-off research notes that can map `rwref_*` back to titles

## Key Handling

The key is never committed. Team members may use one of these private channels:

- Local file outside the repo: `/Users/james/Documents/PUF/private/reference-work-vault.key`
- CI or deployment secret: `REFERENCE_WORK_VAULT_KEY`

The key value must be a base64-encoded 32-byte AES key. It must not appear in `.env`, GitHub Actions YAML, Markdown handoff docs, screenshots, QA reports, browser logs, or issue comments.

## Normal Workflow

1. Edit public constraints and kernels using only `rwref_*`.
2. If a team member needs the real mapping, decrypt the vault locally with the private key.
3. Keep decrypted data in memory or a local ignored scratch file only.
4. Regenerate `reference-work-vault.enc.json` if the mapping changes.
5. Run `npm run check:reference-vault-access`.
6. Run `npm run scan:reference-privacy`.
7. Run `npm run test` before pushing.

## Rotation Workflow

Rotate the key when:

- a team member loses access control,
- a private machine is compromised,
- a key is pasted into a public or semi-public location,
- the vault format changes,
- the representative mapping is regenerated from new research.

Rotation steps:

1. Generate a new base64 AES-256 key.
2. Re-encrypt the private mapping into `reference-work-vault.enc.json`.
3. Replace the local or CI secret out of band.
4. Run `npm run scan:reference-privacy`.
5. Commit only the encrypted vault and public refs.
6. Record the rotation date in a private team log, not this public repository.

## Verification

Required gate:

```bash
npm run check:reference-vault-access
npm run scan:reference-privacy
```

This gate checks:

- encrypted vault shape,
- anonymous public refs,
- runtime `sourceRefs`,
- public rule docs,
- tracked repository files,
- absence of committed vault key files,
- absence of concrete `REFERENCE_WORK_VAULT_KEY` values,
- exact plaintext title leaks when the private key is available.
