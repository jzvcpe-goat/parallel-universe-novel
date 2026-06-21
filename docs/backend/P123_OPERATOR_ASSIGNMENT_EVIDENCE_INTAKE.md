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

The current production unblock follows P138: `edge-only` assignment. Cloud only
hosts the reader frontend and managed data API. AI writing/generation stays on
the user-owned edge device, and the public reader cannot trigger cloud AI. P123
therefore must not ask the operator to invent a remote Agent Runtime service id,
Agent origin, or Agent secret-store confirmation.

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

P140 prepares the current frontend and edge-only Agent boundary in the ignored
P138 intent file:

```text
deploy/runtime-production/runtime-assignment.intent.example.json
deploy/runtime-production/runtime-assignment.intent.local.json
```

The generated contract is:

```text
deploy/runtime-production/generated/remote-assignment.contract.json
```

The tracked example projection is the clean-checkout fallback for CI; the
ignored local intent is the operator-editable copy. The old
`deploy/runtime-production/remote-assignment.local.json` env/apply path is now
a legacy full-remote fallback only. It is valid only if the operator explicitly
chooses a full remote API plus Agent Runtime deployment.

| Evidence key | Meaning | Rule |
| --- | --- | --- |
| `RUNTIME_ASSIGNMENT_OPERATOR_OWNER` | Deployment owner or accountable team | Non-empty, no whitespace, not a placeholder |
| `RUNTIME_ASSIGNMENT_FRONTEND_PROVIDER` | Frontend hosting provider | Usually inferred; override only if Pages host changes |
| `RUNTIME_ASSIGNMENT_FRONTEND_SERVICE_ID` | Frontend service id | Usually inferred from the GitHub repository |
| `RUNTIME_ASSIGNMENT_FRONTEND_ORIGIN` | Frontend HTTPS origin | Usually inferred as the GitHub Pages owner origin |
| `RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID` or `SUPABASE_PROJECT_REF` | Managed data API service id or project ref | Non-empty managed data service id, not a secret |
| `RUNTIME_ASSIGNMENT_DATA_API_ORIGIN` or `SUPABASE_URL` | Managed data API HTTPS origin | Remote HTTPS origin, no path, no localhost, no placeholder |
| `RUNTIME_ASSIGNMENT_FRONTEND_CONFIGURED` | Frontend public configuration confirmation | Exactly `true` after public config exists |
| `RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED` | Managed data API publishable/RLS configuration confirmation | Exactly `true` after publishable key and read/write policy are configured |
| `agent.remote_required` | Remote Agent Runtime requirement | Always `false` for edge-only launch |
| `agent.ai_generation_cloud_runtime` | Cloud AI generation runtime | Always `false` for edge-only launch |
| `agent.reader_can_trigger_ai` | Reader-triggered cloud AI generation | Always `false` for edge-only launch |

The frontend rows are auto-prepared from the current GitHub Pages repository
unless the operator explicitly overrides them. The real external evidence still
comes from the managed data API rows: project ref, HTTPS origin,
publishable/RLS readiness and `health_probe`.

Secret values themselves never belong in the assignment file, artifacts,
Markdown handoff, GitHub Pages variables, logs, or CI output. Only boolean
configuration confirmation is accepted.

## Inputs

P123 reads the latest current-head evidence from:

- P121 loop next goal ledger
- P122 operator-return fixture isolation
- P120 remote operator return intake
- P117 remote assignment env dry-run
- P75 remote assignment intake for the current edge-only intent/contract or the
  explicitly selected legacy local assignment
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

P125 is still the validation fixture for the legacy full-remote P117 env
validator, and P126 is still the apply fixture for the legacy full-remote P116
write helper. P125/P126/P128/P129 remain as compatibility gates for the older
P117/P116 env/apply flow. They stay in root test so the historical path is
still safe, but they must not override the P138 edge-only selected goal.
P130 verifies that P121 and P123 publish the same P138 compiler sequence, so
stale apply commands cannot re-enter the primary loop artifact. P131 validates
the uploaded P130 proof, and P132 verifies current-head coherence.
P132 then verifies the selected assignment-intake loop is backed by the same
current-head P119/P120/P121/P123/P130/P131 evidence.

## Next Command Sequence

```bash
cp deploy/runtime-production/runtime-assignment.intent.env.example \
  deploy/runtime-production/runtime-assignment.intent.env.local
RUNTIME_ASSIGNMENT_INTENT_ENV_FILE=deploy/runtime-production/runtime-assignment.intent.env.local \
RUNTIME_ASSIGNMENT_INTENT_FORCE=true npm run prepare:runtime-assignment-intent
npm run remote-assignment:prepare
npm run check:remote-runtime-assignment-intake
npm run remote-health:check
npm run check:remote-operator-return-intake
npm run check:loop-next-goal-ledger
```

After the assignment evidence is complete, P121 should stop selecting
`operator-assignment-evidence-intake` and route the loop to
`remote-health-evidence-intake`.

## Acceptance

1. `package.json` exposes `check:operator-assignment-evidence-intake`.
2. Root `npm run test` runs P123 after P121 and P122, then P124, P147,
   P148, P125, P126, P128, P129, P130, P131, P132 and P133 before dependency
   audit.
3. P123 only passes when P121 selected `operator-assignment-evidence-intake`.
4. P123 only passes when P120 still reports
   `operator_return_waiting_for_assignment`.
5. P123 verifies local assignment image drift is clear when the ignored local
   assignment exists; in CI/public checkout where the ignored assignment is
   absent, P123 verifies the absence is consistently reported by P75, P113 and
   P120.
6. P123 verifies P122 references the same current P121 loop ledger and P120
   operator-return intake that P123 is about to package.
7. P123 uses the current-head P117 `operator_env_not_supplied` artifact for
   the waiting state, so later P125/P126/P129 ready/follow-up fixtures cannot be
   mistaken for real operator evidence.
8. P123 verifies local assignment files remain untracked.
9. P123 emits JSON and Markdown handoff artifacts.
10. P123 artifacts remain redacted and contain no secrets, prompt plumbing,
   private title material, runtime identifiers or candidate prose.
11. P124 downloads and validates the uploaded P123 artifact content in the same
   Pages run before the artifact can be used as operator handoff evidence.
12. P123 records `runtimeTopology=edge-only-preferred`.
13. P123 requires the frontend/data API evidence and the explicit remote Agent
    absence boundary.
14. P123 does not require `REMOTE_AGENT_SERVICE_ID`, `REMOTE_AGENT_ORIGIN` or
    `REMOTE_AGENT_SECRETS_CONFIGURED=true`.
15. P128/P129 continue to validate the legacy full-remote env/apply path without
    becoming the selected edge-only unblock.
16. P130 validates that P121/P123 expose the P138
    `remote-assignment:prepare` sequence.
17. P132 validates that the assignment-intake evidence chain uses current-head
    P119/P120/P121/P123/P130/P131 artifacts.
18. In edge-only mode, the P123 public handoff must project blocking stages from
    the P138 intent/health boundary, not from the legacy full-remote assignment
    draft. Missing remote Agent service id, origin, secret-store confirmation or
    health must not appear as current blockers.
19. P123 must publish the P140 preparation command before the compiler command,
    so operators do not have to copy the intent example by hand.
20. P123 verifies the current waiting P117 no-env artifact follows the same
    edge-only projection: `REMOTE_AGENT_SERVICE_ID`, `REMOTE_AGENT_ORIGIN` and
    `REMOTE_AGENT_SECRETS_CONFIGURED` must not reappear as current missing
    evidence.
21. P146 provides the primary edge-only operator template and P140 loader:
    `RUNTIME_ASSIGNMENT_INTENT_ENV_FILE` must be the documented path for
    operator-supplied data API evidence.
22. P147 emits the edge-only operator evidence packet after P124 so deployment
    operators see the current Data API/Supabase inputs and do not confuse the
    selected path with the legacy full-remote Agent handoff.
23. P148 proves the fixture-only Data API evidence transition after P147 and
    before the legacy full-remote operator assignment fixture chain.

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
- If P147 cannot package the edge-only operator evidence packet from P123 and
  P146, the selected `operator-assignment-evidence-intake` loop remains too
  ambiguous to hand off.
