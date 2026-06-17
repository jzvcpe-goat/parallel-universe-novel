# P50 P4 Document-Core Reset

Date: 2026-06-17

## Goal

P4 is rebuilt from the product documents, not from any one-off intake note. The active runtime source is now the versioned document registry:

- `docs/product/rules/genre-runtime-rules.v1.json`
- `docs/product/rules/GENRE_CONSTRAINT_RULES.md`
- `docs/product/rules/GENRE_KERNEL_RULES.md`
- `docs/baseline/NarrativeOS_Quantum_Engineering_Contract_v3_Onboarding.md`

The registry declares `documentCore.policy = document_registry_only`. Any browser note, backend review suggestion, provider prompt experiment, or manual research note is non-executable until the team converts it into a reusable `ConstraintProfile` rule and a compatible `GenreKernel` behavior.

## Runtime Boundary

P4 runtime behavior:

1. Resolve profiles from selected product template, selected genre, user seed, and explicit author override.
2. Load rules only from `ConstraintProfile.rules[]`.
3. Select kernels only through `GenreKernel.compatibleProfiles`.
4. Use kernels to influence BeatPlan, motive pressure, conflict pressure, climax recovery, and time controls.
5. Send any violation through Quality Brake using the documented `failBehavior`.

P4 does not allow:

- one-off branches in workflows,
- backend service conditionals that bypass the registry,
- provider-adapter prompt patches,
- public UI copy that exposes profile ids, kernel ids, source refs, provider details, or prompt plumbing,
- plaintext representative work names.

## Verification

New gate:

```bash
npm run check:p4-document-core
```

The gate verifies:

- the runtime registry points to the v3 baseline contract,
- human-editable source documents exist,
- research intake notes are marked non-executable,
- the registry does not contain ad hoc override keys or one-off branches,
- all profiles and kernels use anonymous `rwref_*` source refs,
- every kernel maps back to at least one document profile.

Existing gate:

```bash
npm run scan:p4-rule-source
```

continues to verify schema shape, registry/document sync, privacy, and absence of hardcoded registry id branches in runtime code.

The P4 gates intentionally do not carry a list of sample-specific terms. A
browser comment, provider experiment, or manual research note can guide research,
but it cannot become executable logic until it is generalized into the document
registry.

## Handoff Standard

When adding a new premise boundary:

1. Edit the human rule document.
2. Sync `genre-runtime-rules.v1.json`.
3. Add resolver coverage that selects the profile through public product inputs.
4. Add Quality Brake fixture coverage for the documented fail behavior.
5. Run `npm run check:p4-document-core`, `npm run scan:p4-rule-source`, and `npm run test`.
