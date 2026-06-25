# P173 Kernel Constraint Legal Privacy Loop

This gate closes the current loop goal for kernel and constraint privacy:
representative works may inform frozen genre structures, but their names must
never be visible to public users, non-team operators, public UI, public API
responses, release artifacts, or the human-readable kernel and constraint
rules.

## Completion Standard

No representative work name is visible to public users or non-team members.

This means:

- `GENRE_CONSTRAINT_RULES.md` uses anonymous `rwref_*` values only.
- `GENRE_KERNEL_RULES.md` uses anonymous `rwref_*` values only.
- `genre-runtime-rules.v1.json` declares
  `privacy.representativeWorks=encrypted_vault_only`.
- `reference-work-public-refs.json` exposes only anonymous IDs.
- `reference-work-vault.enc.json` contains only AES-256-GCM encrypted payload
  fields and never plaintext titles, authors, works, mappings or refs.
- Narrative OKF cards for constraints and kernels carry
  `representative_work_names: encrypted_vault_only`.
- Agent runtime reads the registry instead of carrying private title lists.
- P111, P127 and P139 artifacts are all passed and redacted before this gate
  succeeds.

## Why This Exists

P111 proves the encryption-completion boundary, P127 proves custody, and P139
proves kernel/constraint reference encryption. P173 is intentionally narrower:
it is the loop closure gate for the legal-risk requirement that kernel and
constraint materials must not expose representative work names to users or
non-team members.

The gate does not introduce a new privacy model. It aggregates the existing
privacy model so future contributors can see the current completion point
without reverse-engineering older P-gates.

## Command

```bash
npm run check:kernel-constraint-legal-privacy-loop
```

The command writes a redacted artifact:

```text
artifacts/runtime/kernel-constraint-legal-privacy-loop-*.json
```

Pages uploads this artifact as `kernel-constraint-legal-privacy-loop`, and P92
downloads it in current-run mode through `check:public-privacy-artifacts`. That
keeps the legal privacy loop release-evidence backed instead of only locally
asserted.

## Handoff Notes

- Do not paste representative work titles into kernel docs, constraint docs,
  runtime registry files, OKF cards, agent runtime tests, UI fixtures, release
  evidence, or public issue comments.
- If a team member needs the private mapping, use the local vault key through
  the documented vault access procedure. Do not commit the decrypted mapping.
- Public copy may describe genre structures, reader expectations and pacing
  logic, but not the private works used to derive those structures.
- Any future source-reference expansion must update the encrypted vault, public
  anonymous refs and runtime registry together, then run P111, P127, P139 and
  this P173 gate.

## Acceptance Table

| Area | Checked | Issue Found | Fix Applied | Gate |
| ---- | ------- | ----------- | ----------- | ---- |
| Constraint docs | Anonymous refs only | No | None | `check:kernel-constraint-legal-privacy-loop` |
| Kernel docs | Anonymous refs only | No | None | `check:kernel-constraint-legal-privacy-loop` |
| Runtime registry | Encrypted-vault boundary and anonymous refs | No | None | `check:kernel-constraint-legal-privacy-loop` |
| OKF cards | `encrypted_vault_only` boundary | No | None | `check:kernel-constraint-legal-privacy-loop` |
| Upstream artifacts | P111, P127 and P139 passed/redacted | No | None | `check:kernel-constraint-legal-privacy-loop` |
