# P99 Release Workflow Ordering Gate

Date: 2026-06-18

## Goal

P99 prevents Pages release evidence from racing ahead of runtime image evidence.
The public Pages workflow must no longer deploy directly from `push`. A main
branch push first publishes current-head runtime images through P71/P72, then
Pages deploys from the successful `Publish Runtime Images` workflow run.

This keeps the P90 remote blocker artifact from mixing a current Pages head with
stale P72 image evidence.

## Contract

`Publish Runtime Images`:

- runs on `push` to `main`,
- still supports `workflow_dispatch`,
- publishes both runtime images for the commit SHA,
- owns the current-head P72 image evidence.

`Deploy Creator Studio Preview`:

- runs on `workflow_run` after `Publish Runtime Images` completes successfully,
- still supports `workflow_dispatch` for explicit operator reruns,
- checks out `github.event.workflow_run.head_sha` for workflow-run deployments,
- does not deploy on direct `push`,
- keeps the existing public runtime, privacy, assignment and blocker artifact gates.

## Boundary

P99 does not enable public live runtime, provision remote services, change
provider secrets, or weaken P72/P90. It only makes the CI ordering explicit so
current-run Pages artifacts and current-head runtime image evidence stay
consistent.

## Commands

```bash
npm run check:release-workflow-ordering
npm run check:runtime-image-workflow
npm run check:pages-live-release-gate
npm run test
```

## Acceptance

1. `.github/workflows/runtime-images.yml` contains `push` on `main` and
   `workflow_dispatch`.
2. `.github/workflows/pages.yml` contains `workflow_run` for
   `Publish Runtime Images`.
3. `.github/workflows/pages.yml` does not contain a direct `push` trigger.
4. Pages build is gated by `github.event.workflow_run.conclusion == 'success'`
   for workflow-run events.
5. Pages checkout uses `github.event.workflow_run.head_sha || github.sha`.
6. Root `npm run test` includes `check:release-workflow-ordering`.
7. P16/P71/P72 documentation reflects the ordered release chain.
