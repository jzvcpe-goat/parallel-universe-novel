# P107 CI Artifact Content Coverage Matrix

P107 prevents a common release-chain failure: a workflow can upload an artifact
and P43 can prove that the artifact exists, while nobody owns the content check.
This gate does not deploy anything and does not unblock live runtime. It creates
a machine-readable matrix that classifies every Pages release artifact by the
strongest available evidence gate.

Command:

```bash
npm run check:ci-artifact-content-coverage
```

The command writes:

```text
artifacts/runtime/ci-artifact-content-coverage-*.json
```

## Coverage Classes

| Class | Meaning |
| --- | --- |
| `download_content_gate` | The artifact is downloaded from the same GitHub Actions run and its JSON/Markdown content is verified. |
| `pre_upload_generator_gate` | The artifact is generated and checked by root release gates before upload; P43 then proves it was preserved in the run. |
| `built_bundle_privacy_scan` | The Pages bundle is built, scanned for public privacy before upload, and SPA fallback is checked by root test. |
| `visual_human_evidence` | Browser QA generates screenshot evidence; P43 proves the image artifact exists for human inspection. |

## Matrix

| Artifact | Coverage Class | Producer | Verifier | Contract |
| --- | --- | --- | --- | --- |
| `runtime-readiness-ledger` | `pre_upload_generator_gate` | `audit:live-runtime-readiness` | `check:runtime-readiness-ledger` | P23 |
| `live-cutover-attestation` | `pre_upload_generator_gate` | `check:live-cutover-attestation` | `check:live-cutover-attestation` | P76 |
| `live-rollback-rehearsal` | `pre_upload_generator_gate` | `check:live-rollback-rehearsal` | `check:live-rollback-rehearsal` | P77 |
| `remote-runtime-activation-control` | `pre_upload_generator_gate` | `check:remote-runtime-activation-control` | `check:remote-runtime-activation-control` | P78 |
| `remote-assignment-handoff` | `download_content_gate` | `check:remote-assignment-handoff` | `check:remote-assignment-handoff-artifact` | `P89_REMOTE_ASSIGNMENT_HANDOFF_ARTIFACT_ATTESTATION` |
| `remote-assignment-schema` | `download_content_gate` | `check:remote-assignment-schema` | `check:remote-assignment-artifacts` | `P93_REMOTE_ASSIGNMENT_ARTIFACT_ATTESTATION` |
| `remote-assignment-execution-pack` | `download_content_gate` | `check:remote-assignment-execution-pack` | `check:remote-assignment-artifacts` | `P93_REMOTE_ASSIGNMENT_ARTIFACT_ATTESTATION` |
| `remote-assignment-fixture-gate` | `download_content_gate` | `check:remote-assignment-fixture` | `check:remote-assignment-artifacts` | `P93_REMOTE_ASSIGNMENT_ARTIFACT_ATTESTATION` |
| `remote-runtime-blockers` | `download_content_gate` | `check:remote-runtime-blockers` | `check:remote-runtime-blockers-artifact` | `P90_REMOTE_RUNTIME_BLOCKER_ARTIFACT_ATTESTATION` |
| `remote-assignment-fill-plan` | `download_content_gate` | `check:remote-assignment-fill-plan` | `check:remote-assignment-fill-plan-artifact` | `P106_REMOTE_ASSIGNMENT_FILL_PLAN_ARTIFACT_ATTESTATION` |
| `remote-assignment-strict-run-package` | `download_content_gate` | `check:remote-assignment-strict-run-package` | `check:remote-assignment-strict-run-package-artifact` | `P118_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE` |
| `remote-operator-readiness-packet` | `download_content_gate` | `check:remote-operator-readiness-packet` | `check:remote-operator-readiness-packet-artifact` | `P119_REMOTE_OPERATOR_READINESS_PACKET` |
| `remote-operator-return-intake` | `download_content_gate` | `check:remote-operator-return-intake` | `check:remote-operator-return-intake-artifact` | `P120_REMOTE_OPERATOR_RETURN_INTAKE` |
| `operator-assignment-evidence-intake` | `download_content_gate` | `check:operator-assignment-evidence-intake` | `check:operator-assignment-evidence-intake-artifact` | `P124_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE_ATTESTATION` |
| `edge-only-operator-evidence-packet` | `download_content_gate` | `check:edge-only-operator-evidence-packet` | `check:edge-only-operator-evidence-packet-artifact` | `P147_EDGE_ONLY_OPERATOR_EVIDENCE_PACKET_ATTESTATION` |
| `edge-only-data-api-evidence-readiness` | `pre_upload_generator_gate` | `check:edge-only-data-api-evidence-readiness` | `check:edge-only-data-api-evidence-readiness` | `P150_EDGE_ONLY_DATA_API_EVIDENCE_READINESS` |
| `edge-only-data-api-strict-intake` | `download_content_gate` | `check:edge-only-data-api-strict-intake` | `check:edge-only-data-api-strict-intake-artifact` | `P155_EDGE_ONLY_DATA_API_STRICT_INTAKE_ARTIFACT_ATTESTATION` |
| `edge-only-data-api-evidence-transition-fixture` | `download_content_gate` | `check:edge-only-data-api-evidence-transition-fixture` | `check:edge-only-data-api-evidence-transition-fixture-artifact` | `P148_EDGE_ONLY_DATA_API_EVIDENCE_TRANSITION_FIXTURE` |
| `operator-assignment-loop-command-consistency` | `download_content_gate` | `check:operator-assignment-loop-command-consistency` | `check:operator-assignment-loop-command-consistency-artifact` | `P131_OPERATOR_ASSIGNMENT_COMMAND_CONSISTENCY_ARTIFACT_ATTESTATION` |
| `operator-assignment-current-head-coherence` | `download_content_gate` | `check:operator-assignment-current-head-coherence` | `check:operator-assignment-current-head-coherence` | `P132_OPERATOR_ASSIGNMENT_CURRENT_HEAD_COHERENCE` |
| `operator-evidence-return-fast-path` | `download_content_gate` | `check:operator-evidence-return-fast-path` | `check:operator-evidence-return-fast-path-artifact` | `P174_OPERATOR_EVIDENCE_RETURN_FAST_PATH_ARTIFACT_ATTESTATION` |
| `operator-operations-continuity` | `download_content_gate` | `check:operator-operations-continuity` | `check:operator-operations-continuity-artifact` | `P172_OPERATOR_OPERATIONS_CONTINUITY_ARTIFACT_ATTESTATION` |
| `operator-assignment-transition-fixture` | `download_content_gate` | `check:operator-assignment-transition-fixture` | `check:operator-assignment-transition-fixture-artifact` | `P133_OPERATOR_ASSIGNMENT_TRANSITION_FIXTURE_ATTESTATION` |
| `runtime-image-local-smoke` | `download_content_gate` | `check:runtime-image-local-smoke` | `check:runtime-image-local-smoke-artifact` | `P115_RUNTIME_IMAGE_LOCAL_SMOKE_ARTIFACT_ATTESTATION` |
| `zero-cost-reader-edge-sync` | `download_content_gate` | `check:zero-cost-reader-edge-sync` | `check:zero-cost-reader-edge-sync-artifact` | `P136_ZERO_COST_READER_EDGE_SYNC_ARTIFACT_ATTESTATION` |
| `remote-health-evidence` | `download_content_gate` | `check:remote-health-evidence-artifact` | `check:remote-health-evidence-artifact` | `P145_REMOTE_HEALTH_EVIDENCE_ARTIFACT_GATE` |
| `reference-privacy` | `download_content_gate` | `scan:reference-privacy` | `check:public-privacy-artifacts` | `P92_PUBLIC_PRIVACY_ARTIFACT_ATTESTATION` |
| `public-projection-privacy` | `download_content_gate` | `check:public-projection-privacy` | `check:public-privacy-artifacts` | `P92_PUBLIC_PRIVACY_ARTIFACT_ATTESTATION` |
| `reference-work-encryption-completion` | `download_content_gate` | `check:reference-work-encryption-completion` | `check:public-privacy-artifacts` | `P111_REFERENCE_WORK_ENCRYPTION_COMPLETION_GATE` |
| `representative-work-custody` | `download_content_gate` | `check:representative-work-custody` | `check:public-privacy-artifacts` | `P127_REPRESENTATIVE_WORK_CUSTODY_GATE` |
| `kernel-constraint-reference-encryption` | `download_content_gate` | `check:kernel-constraint-reference-encryption` | `check:public-privacy-artifacts` | `P139_KERNEL_CONSTRAINT_REFERENCE_ENCRYPTION_GATE` |
| `local-live-runtime-visual-qa` | `visual_human_evidence` | `qa:live-runtime-local` | `qa:live-runtime-local` | P15 |
| `github-pages` | `built_bundle_privacy_scan` | `npm --prefix app run build` | `scan:reference-privacy` + `check:public-projection-privacy` + `check:github-pages-spa-fallback` | P16/P80/P83 |

## Contract

The gate verifies that:

- P43 metadata coverage still includes all thirty-three Pages artifacts.
- Every artifact has exactly one explicit coverage class.
- Download-attested artifacts have a package script, root-test wiring, Pages
  workflow step and human-readable documentation. `operator-evidence-return-fast-path`
  is download-attested by P174 after P169 uploads the P168 contract;
  `operator-operations-continuity` is download-attested by P172 after P171
  uploads the P170 packet.
- Pre-upload artifacts have a generator/verifier in root test.
- The Pages bundle is scanned after build and before upload.
- Visual QA screenshots are generated before upload.
- P16 and P43 name every artifact and the relevant verification path.

## Public Boundary

The P107 matrix may contain artifact names, scripts, contracts, coverage class
and safe release-engineering reasons. It must not contain secrets, private
representative-work mappings, candidate story text, raw runtime payloads,
database URLs, provider keys or prompt payloads.

## Acceptance

- `package.json` exposes `check:ci-artifact-content-coverage`.
- Root `npm run test` runs P107 after the artifact content gates.
- `check:pages-live-release-gate` confirms P107 is wired into package scripts,
  root test and release docs.
- P43 remains the metadata gate, while P107 explains which content gate or
  generator gate owns each artifact.
