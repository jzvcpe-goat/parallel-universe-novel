# P123 Operator Assignment Evidence Intake

Status: active gate  
Boundary: operator assignment intake, no deployment side effects  
Owner: release engineering + deployment operator  
Date: 2026-06-19

## Purpose

P121 selects `operator-assignment-evidence-intake` when P120 proves that the
real ignored operator assignment is still missing or incomplete. P122 then
proves that the loop was not fooled by the assignment fixture. P123 turns that
state into a safe, machine-checkable operator intake packet.

P123 does not deploy anything. It does not write
`deploy/runtime-production/remote-assignment.local.json`, does not create
remote services, does not set GitHub variables, does not store provider
credentials, does not promote live runtime, and does not treat fixture evidence
as readiness.

## Command

```bash
npm run check:operator-assignment-evidence-intake
```

## Required Operator Evidence

The deployment operator must provide these values through environment variables
or an equivalent local-only handoff before `apply:remote-assignment-env` is
allowed to write the ignored assignment file.

| Env key | Meaning | Rule |
| --- | --- | --- |
| `REMOTE_OPERATOR_OWNER` | Deployment owner or accountable team | Non-empty, no whitespace, not a placeholder |
| `REMOTE_OPERATOR_PROVIDER` | Hosting provider name | Non-empty, no whitespace, not a placeholder |
| `REMOTE_API_SERVICE_ID` | FastAPI provider service id | Non-empty provider id, not a secret |
| `REMOTE_AGENT_SERVICE_ID` | Agent Runtime provider service id | Non-empty provider id, not a secret |
| `REMOTE_API_ORIGIN` | FastAPI HTTPS origin | Remote HTTPS origin, no path, no localhost, no placeholder |
| `REMOTE_AGENT_ORIGIN` | Agent Runtime HTTPS origin | Remote HTTPS origin, distinct from API origin |
| `REMOTE_API_SECRETS_CONFIGURED` | API provider-side secret-store confirmation | Exactly `true` only after provider-side secrets exist |
| `REMOTE_AGENT_SECRETS_CONFIGURED` | Agent provider-side secret-store confirmation | Exactly `true` only after provider-side secrets exist |

Secret values themselves never belong in the assignment file, artifacts,
Markdown handoff, GitHub Pages variables, logs, or CI output. Only boolean
provider-side confirmation is accepted.

## Inputs

P123 reads the latest current-head evidence from:

- P121 loop next goal ledger
- P122 operator-return fixture isolation
- P120 remote operator return intake
- P117 remote assignment env dry-run
- P75 remote assignment intake for `remote-assignment.local.json`
- P113 remote assignment image drift
- P108 remote assignment local boundary
- P105 remote assignment fill plan

## Output

P123 emits:

- `artifacts/runtime/operator-assignment-evidence-intake-*.json`
- `artifacts/runtime/operator-assignment-evidence-intake-*.md`

The packet is safe for operator handoff. It includes the selected goal, required
non-secret evidence, current blockers and next commands. It must not expose
private title material, internal runtime identifiers, prompt plumbing,
candidate prose, token values, provider payloads or database URLs.

P125 is the validation fixture for the next step in this handoff: P117 must
accept a complete safe operator env fixture, reject unsafe negative fixtures
and keep outputs redacted before real operator evidence is applied.
P126 is the apply fixture after that: P116 must write only a temporary fixture
target with safe inputs and leave the production ignored assignment unchanged.
P128 follows with the copyable env template that the operator can fill locally
before running P117 and P116 against real non-secret assignment evidence.

## Next Command Sequence

```bash
cp deploy/runtime-production/remote-assignment.env.example \
  deploy/runtime-production/remote-assignment.env.local
# Fill the ignored local env file, then load it in the current shell.
npm run check:remote-assignment-env-dry-run
REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true npm run apply:remote-assignment-env
npm run check:remote-runtime-assignment-intake
npm run check:remote-operator-return-intake
npm run check:loop-next-goal-ledger
```

After the assignment evidence is complete, P121 should stop selecting
`operator-assignment-evidence-intake` and route the loop to
`remote-health-evidence-intake`.

## Acceptance

1. `package.json` exposes `check:operator-assignment-evidence-intake`.
2. Root `npm run test` runs P123 after P121 and P122, then P124, P125, P126 and P128 before dependency audit.
3. P123 only passes when P121 selected `operator-assignment-evidence-intake`.
4. P123 only passes when P120 still reports
   `operator_return_waiting_for_assignment`.
5. P123 verifies local assignment image drift is clear when the ignored local
   assignment exists; in CI/public checkout where the ignored assignment is
   absent, P123 verifies the absence is consistently reported by P75, P113 and
   P120.
6. P123 verifies local assignment files remain untracked.
7. P123 emits JSON and Markdown handoff artifacts.
8. P123 artifacts remain redacted and contain no secrets, prompt plumbing,
   private title material, runtime identifiers or candidate prose.
9. P124 downloads and validates the uploaded P123 artifact content in the same
   Pages run before the artifact can be used as operator handoff evidence.
10. P125 validates the P117 operator env validator with positive and negative
    fixtures before the operator handoff can be treated as mechanically ready.
11. P126 validates the P116 apply helper with a temporary fixture target before
    real operator evidence is written.
12. P128 validates the tracked local env template and ignored local env target
    before a deployment operator fills real values.

## Failure Modes

- If P121 selects a different next goal, P123 fails because this gate is no
  longer the correct loop step.
- If P122 did not isolate fixture evidence, P123 fails because the selected
  goal may be based on fixture readiness.
- If P117 already has complete operator evidence but P121 still selected
  assignment intake, P123 fails and forces the loop ledger to be refreshed.
- If P113 detects image drift, P123 fails and points back to
  `REMOTE_ASSIGNMENT_DRAFT_FORCE=true npm run prepare:remote-assignment-local`.
- If the ignored local assignment is absent in CI, P123 stays green only when
  P75, P113 and P120 all agree that the next action is operator assignment
  evidence intake rather than strict activation.
- If Pages uploads the P123 packet but P124 cannot validate the downloaded
  JSON/Markdown content, the release gate fails before deployment evidence is
  accepted.
