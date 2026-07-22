#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const evidencePath = resolve(
  root,
  'validation/creator-ui/frozen-paired-quality-verifier-evidence-revision-real-trial-2026-07-18/summary.json',
)
const failures = []

function expect(condition, message) {
  if (!condition) failures.push(message)
}

expect(existsSync(evidencePath), 'missing real paired-verification evidence-revision receipt')
const receipt = existsSync(evidencePath) ? JSON.parse(readFileSync(evidencePath, 'utf8')) : {}

expect(receipt.schemaVersion === 'creator-frozen-paired-quality-real-trial.v1', 'receipt schema mismatch')
expect(receipt.fixture?.id === 'frozen-original-glass-lung-endurance-v1', 'receipt must use the frozen glass-lung fixture')
expect(receipt.fixture?.realWorkingAgent === true, 'receipt must use the real Working Agent')
expect(receipt.fixture?.realChapterMaterialUsed === false, 'fault-injection trial must not read current chapter material')
expect(receipt.evaluation?.verificationEvidenceFailureRequested === true, 'receipt must retain the explicit fault-injection request')
expect(receipt.evaluation?.verificationEvidenceFailureInjected === true, 'bridge must leave a non-prose receipt proving the fault was injected')
expect(typeof receipt.evaluation?.verificationEvidenceFaultTargetDimension === 'string', 'fault injection must identify the affected literary dimension')
expect(receipt.evaluation?.verificationEvidenceRevisionApplied === true, 'second Auditor must execute the bounded evidence revision')
expect(receipt.evaluation?.independentVerificationCompleted === true, 'independent verification must complete after correction')
expect(receipt.evaluation?.overallWinnerDeclared === false, 'trial must not declare a composite winner')
expect(receipt.evaluation?.compositeLiteraryScoreUsed === false, 'trial must not use a composite literary score')

const operations = receipt.runtime?.roleOperations ?? []
expect(operations.filter(item => item.operation === 'paired_literary_comparison_verification').length === 1, 'trial must execute one initial independent verification')
expect(operations.filter(item => item.operation === 'paired_literary_comparison_verification_revision').length === 1, 'trial must execute exactly one verification evidence revision')
expect(operations.every(item => item.canonCommitAllowed === false), 'no real role call may commit Canon')

for (const candidate of [receipt.candidates?.directWriter, receipt.candidates?.architectWriterWorkflow]) {
  expect(candidate?.visibleLength >= 2700 && candidate?.visibleLength <= 3400, 'both candidates must satisfy the visible-length contract')
  expect(candidate?.completeEnding === true, 'both candidates must retain complete endings')
}

for (const boundary of [
  'repositoryWritePerformed',
  'candidateAdopted',
  'canonChanged',
  'chapter20AccessedOrChanged',
  'chapter21AccessedOrChanged',
  'cloudDataChanged',
  'publicationPerformed',
  'rawDraftPersistedInRepository',
  'rawBlindMappingPersistedInRepository',
]) {
  expect(receipt.boundaries?.[boundary] === false, `real verification correction crossed boundary ${boundary}`)
}

const bridgeSource = readFileSync(resolve(root, 'scripts/creator-working-agent-bridge.mjs'), 'utf8')
expect(bridgeSource.includes('PUF_CREATOR_TEST_INJECT_PAIRED_VERIFICATION_EVIDENCE_FAILURE'), 'bridge must make fault injection explicit and test-only')
expect(bridgeSource.includes('paired_verification_evidence_fault_injection_forbidden_in_production'), 'bridge must reject fault injection in production')
expect(bridgeSource.includes('literaryDecisionChanged: false'), 'fault receipt must state that literary semantics were not changed')
expect(bridgeSource.includes('hardConstraintChanged: false'), 'fault receipt must state that hard-constraint semantics were not changed')

if (failures.length > 0) {
  console.error('[creator-paired-verification-revision-real-trial] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[creator-paired-verification-revision-real-trial] PASS (real model, injected evidence failure, one bounded correction, no canon/public write)')
