import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { request as httpRequest } from 'node:http'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { assertMiroFishEvidence } from './mirofish-character-evidence.mjs'
import { assertMiroFishCharacterReview } from './mirofish-character-review.mjs'

const { values } = parseArgs({
  options: {
    'base-url': { type: 'string', default: 'http://127.0.0.1:4318' },
    'reflector-prompt': { type: 'string' },
    'initial-simulation': { type: 'string' },
    'initial-review': { type: 'string' },
    'private-output': { type: 'string' },
    output: { type: 'string' },
  },
  strict: true,
})

function required(name) {
  const value = values[name]
  if (!value) throw new Error(`Missing required --${name} argument.`)
  return path.resolve(value)
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function payloadFromPrompt(prompt) {
  const marker = '当前资料：'
  const markerIndex = prompt.lastIndexOf(marker)
  assert.notEqual(markerIndex, -1, 'Reflector prompt must contain its source payload.')
  return JSON.parse(prompt.slice(markerIndex + marker.length).trim())
}

async function postJson(url, payload) {
  const body = JSON.stringify(payload)
  return new Promise((resolveRequest, rejectRequest) => {
    const request = httpRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, response => {
      const chunks = []
      response.on('data', chunk => chunks.push(Buffer.from(chunk)))
      response.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString('utf8')
        try {
          resolveRequest({
            ok: (response.statusCode ?? 500) >= 200 && (response.statusCode ?? 500) < 300,
            statusCode: response.statusCode ?? 500,
            body: JSON.parse(rawBody),
          })
        } catch (error) {
          rejectRequest(new Error(`Working agent returned invalid JSON (${response.statusCode ?? 500}): ${rawBody}`, { cause: error }))
        }
      })
    })
    request.on('error', rejectRequest)
    request.end(body)
  })
}

const prompt = await readFile(required('reflector-prompt'), 'utf8')
const source = payloadFromPrompt(prompt)
const initialSimulation = JSON.parse(await readFile(required('initial-simulation'), 'utf8'))
const initialReview = JSON.parse(await readFile(required('initial-review'), 'utf8'))
assert.equal(initialReview.decision, 'reject', 'Recovery trial requires a real rejected initial review.')
assertMiroFishEvidence(initialSimulation, source.request, source.artifacts)
assertMiroFishCharacterReview(initialReview, source.request, initialSimulation)

const baseUrl = values['base-url'].replace(/\/$/, '')
const revisionResponse = await postJson(`${baseUrl}/v1/creator-decision`, {
  operation: 'character_simulation_summary',
  attempt: 'initial',
  payload: {
    ...source,
    mode: 'character_simulation_semantic_revision',
    previousSimulation: initialSimulation,
    characterSimulationReview: initialReview,
  },
})
assert.equal(revisionResponse.ok, true, `Reflector revision failed (${revisionResponse.statusCode}): ${JSON.stringify(revisionResponse.body)}`)
const revisedSimulation = {
  ...revisionResponse.body,
  requestId: source.request.requestId,
  provider: 'mirofish',
  simulationRunId: source.manifest.run_id,
}
assertMiroFishEvidence(revisedSimulation, source.request, source.artifacts)

const reviewResponse = await postJson(`${baseUrl}/v1/creator-decision`, {
  operation: 'character_simulation_review',
  attempt: 'initial',
  payload: {
    request: source.request,
    simulation: revisedSimulation,
    mode: 'character_simulation_semantic_revision_review',
  },
})
assert.equal(reviewResponse.ok, true, `Auditor re-review failed (${reviewResponse.statusCode}): ${JSON.stringify(reviewResponse.body)}`)
const finalReview = assertMiroFishCharacterReview(reviewResponse.body, source.request, revisedSimulation)
assert.equal(finalReview.decision, 'pass', `Auditor still rejected the bounded revision: ${JSON.stringify(finalReview.issues)}`)

const privateOutput = required('private-output')
await mkdir(path.dirname(privateOutput), { recursive: true })
await writeFile(privateOutput, `${JSON.stringify({
  source: {
    request: source.request,
    manifest: source.manifest,
    artifacts: source.artifacts,
  },
  initialSimulation,
  initialReview,
  revisedSimulation,
  finalReview,
}, null, 2)}\n`, 'utf8')

const directEvidenceIds = new Set(
  revisedSimulation.evidence
    .filter(item => item.sourceArtifact === 'interviews')
    .map(item => item.id),
)
const proposalEvidenceIds = [
  ...revisedSimulation.characterCardProposals.flatMap(proposal => [
    ...proposal.evidenceIds,
    ...proposal.stateChanges.flatMap(change => change.evidenceIds),
  ]),
  ...revisedSimulation.settingAssetProposals.flatMap(proposal => proposal.evidenceIds),
]
const summary = {
  schemaVersion: 'creator-character-rehearsal-revision-trial.v1',
  completedAt: new Date().toISOString(),
  chapter: 20,
  provider: 'mirofish',
  simulationRunId: source.manifest.run_id,
  workflow: ['MiroFish', 'Reflector', 'Auditor reject', 'Reflector bounded revision', 'Auditor pass'],
  initial: {
    characterCardProposalCount: initialSimulation.characterCardProposals.length,
    settingAssetProposalCount: initialSimulation.settingAssetProposals.length,
    issueCount: initialReview.issues.length,
  },
  final: {
    characterCardProposalCount: revisedSimulation.characterCardProposals.length,
    settingAssetProposalCount: revisedSimulation.settingAssetProposals.length,
    stateChangeCount: revisedSimulation.characterCardProposals.flatMap(item => item.stateChanges).length,
    directInterviewEvidenceCount: directEvidenceIds.size,
    allProposalEvidenceUsesDirectInterviews: proposalEvidenceIds.every(id => directEvidenceIds.has(id)),
    decision: finalReview.decision,
    issueCount: finalReview.issues.length,
  },
  candidateBoundary: {
    cardSavePerformed: false,
    settingSavePerformed: false,
    canonCommitPerformed: false,
    authorConfirmationStillRequired: true,
  },
  sideEffects: {
    repositoryWritePerformed: false,
    acceptedChapterChanged: false,
    chapter21AccessedOrChanged: false,
    cloudDataChanged: false,
    publicationPerformed: false,
  },
  hashes: {
    sourcePromptSha256: sha256(prompt),
    initialSimulationSha256: sha256(JSON.stringify(initialSimulation)),
    revisedSimulationSha256: sha256(JSON.stringify(revisedSimulation)),
    privateArtifactSha256: sha256(await readFile(privateOutput)),
  },
  containsManuscriptText: false,
}
const output = required('output')
await mkdir(path.dirname(output), { recursive: true })
await writeFile(output, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
