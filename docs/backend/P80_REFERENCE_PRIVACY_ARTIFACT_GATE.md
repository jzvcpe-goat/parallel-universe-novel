# P80 Reference Privacy Artifact Gate

Date: 2026-06-18

## Goal

P80 turns representative-work privacy from a local scan into a release evidence
artifact. Public users, non-team members and GitHub Pages visitors must never
see representative work names, author names, decrypted mappings or vault keys.
The release run must leave a downloadable `reference-privacy` artifact proving
the check ran against the current build and repository state.

## Command

```bash
npm run scan:reference-privacy
```

The command writes:

```text
artifacts/runtime/reference-privacy-*.json
```

The artifact is redacted by contract. It may include scan counts, public ref
count, checked scopes, whether local decrypted-vault scanning was available, and
whether Git history was checked. It must not include violation detail strings,
titles, author names, decrypted `rwref_*` mappings, prompt text, source labels
that identify works, or key values.

## CI Placement

`.github/workflows/pages.yml` runs `npm run scan:reference-privacy` after the
Creator Studio build so `app/dist` is included. It then uploads:

```yaml
name: reference-privacy
path: artifacts/runtime/reference-privacy-*.json
```

The current-run artifact gate requires `reference-privacy` alongside runtime
readiness, rollback, activation, assignment, visual QA and Pages artifacts.

## What This Proves

- Public rule files expose only anonymous `rwref_*` source refs.
- The encrypted vault shape is present and does not contain plaintext title
  fields.
- Runtime `ConstraintProfile` and `GenreKernel` entries use anonymous
  `sourceRefs`.
- Current source files, built Pages output, runtime artifacts and Git history do
  not expose decrypted representative work titles when the team key is
  available.
- No vault key path or concrete key value is committed.

## What This Does Not Prove

- It is not legal advice.
- It does not grant access to the encrypted vault.
- It does not prove external dataset licensing.
- It does not replace team-only secret governance for
  `REFERENCE_WORK_VAULT_KEY`.

## Acceptance

1. `scan:reference-privacy` writes a timestamped redacted JSON artifact.
2. The artifact includes `artifactContract = P80_REFERENCE_PRIVACY_ARTIFACT_GATE`.
3. The artifact includes `violationDetailsIncluded = false`.
4. Pages CI uploads the artifact as `reference-privacy`.
5. `check:github-actions-artifacts` requires `reference-privacy` in current-run
   mode.
6. P45 and P52 include P80 so runtime completion reports cannot omit the privacy
   evidence boundary.
