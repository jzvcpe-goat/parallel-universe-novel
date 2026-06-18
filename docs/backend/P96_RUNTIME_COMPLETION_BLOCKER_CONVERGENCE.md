# P96 Runtime Completion Blocker Convergence

## Purpose

P96 keeps the runtime completion audit and the remote-runtime blocker ledger from
drifting into two different handoff stories. P85 blocker ledger is the source of
truth for operator-facing remote runtime blockers. P45 may still summarize
component completion, but its `commercial-release-chain` open gaps must converge
on the same blocked stage ids that P85/P90 validate.

Contract phrase: P85 blocker ledger is the source of truth.

This avoids a subtle release failure mode: the completion matrix says "six live
readiness blockers", while the blocker ledger says "eight operator blockers".
Both can be individually true, but release owners need one current truth table.

## Command

```bash
npm run check:runtime-completion-blocker-convergence
```

P96 must run after:

```bash
npm run check:remote-runtime-blockers
npm run check:remote-runtime-blockers-artifact
```

The command regenerates the P45 runtime completion artifact after the latest P85
ledger exists, then verifies:

- P45 includes `remoteRuntimeBlockerLedger` summary metadata.
- `commercial-release-chain.openGaps` contains every blocked P85 stage id.
- P45 does not fall back to P23 live-readiness wording while P85 blockers exist.
- The P96 artifact is safe to share with release operators.

## Generated Artifact

```text
artifacts/runtime/runtime-completion-blocker-convergence-*.json
```

The artifact contains only gate names, stage ids, counts and artifact paths. It
must not include provider secrets, system prompt plumbing, reference-work vault
contents, representative work names, `sourceRefs`, `profile.id` or `kernel.id`.

## Acceptance

1. `package.json` exposes `check:runtime-completion-blocker-convergence`.
2. Root `npm run test` runs P96 after P90.
3. P45 runtime completion artifacts include `remoteRuntimeBlockerLedger`.
4. P45 `commercial-release-chain` open gaps mirror P85 blocked stage ids.
5. P96 produces a redacted operator-safe artifact.
