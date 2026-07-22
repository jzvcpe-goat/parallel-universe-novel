#!/usr/bin/env node

import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  coordinateMiroFishSourceLifecycle,
  snapshotMiroFishSimulationIds,
} from './mirofish-cli-lifecycle.mjs'

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

async function waitForCommand(directory, expectedFile) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const files = await readdir(directory).catch(() => [])
    if (files.includes(expectedFile)) {
      return JSON.parse(await readFile(path.join(directory, expectedFile), 'utf8'))
    }
    await sleep(10)
  }
  throw new Error(`command_not_written:${expectedFile}`)
}

const projectPath = await mkdtemp(path.join(tmpdir(), 'puf-mirofish-lifecycle-'))
try {
  const simulationsRoot = path.join(projectPath, 'uploads', 'simulations')
  await mkdir(path.join(simulationsRoot, 'sim-existing'), { recursive: true })
  const knownSimulationIds = await snapshotMiroFishSimulationIds(projectPath)
  assert.deepEqual(knownSimulationIds, ['sim-existing'])

  const child = { exitCode: null }
  const characters = [
    { id: 'character:gu-yao', name: '顾遥' },
    { id: 'character:zhou-yan', name: '周砚' },
  ]
  const lifecycle = coordinateMiroFishSourceLifecycle({
    projectPath,
    knownSimulationIds,
    characters,
    scenario: '只有一箱药，两人必须共同选择。',
    child,
    timeoutMs: 5_000,
    pollIntervalMs: 10,
  })

  const simulationDirectory = path.join(simulationsRoot, 'sim-new')
  const commandsDirectory = path.join(simulationDirectory, 'ipc_commands')
  const responsesDirectory = path.join(simulationDirectory, 'ipc_responses')
  await mkdir(commandsDirectory, { recursive: true })
  await mkdir(responsesDirectory, { recursive: true })
  await writeFile(path.join(simulationDirectory, 'reddit_profiles.json'), JSON.stringify([
    { user_id: 0, name: '护送队' },
    { user_id: 1, name: '周砚' },
    { user_id: 3, name: '顾遥' },
  ]), 'utf8')
  await writeFile(path.join(simulationDirectory, 'env_status.json'), JSON.stringify({ status: 'alive' }), 'utf8')

  const interviewCommand = await waitForCommand(commandsDirectory, 'puf-selected-character-interviews.json')
  assert.equal(interviewCommand.command_type, 'batch_interview')
  assert.deepEqual(interviewCommand.args.interviews.map(item => item.agent_id), [3, 1])
  assert(interviewCommand.args.interviews.every(item => item.prompt.includes('不是小说正文，也不是正史')))
  await writeFile(path.join(responsesDirectory, 'puf-selected-character-interviews.json'), JSON.stringify({
    status: 'completed',
    result: {
      results: {
        1: { response: '我会记录每一份药的去向，并承担少救一个眼前伤员的指责。', timestamp: '2026-07-15T00:00:00Z' },
        3: { response: '我只接受限量救治，但拒绝让眼前的人在无人判断时等死。', timestamp: '2026-07-15T00:00:01Z' },
      },
    },
  }), 'utf8')

  const closeCommand = await waitForCommand(commandsDirectory, 'puf-close-after-rehearsal.json')
  assert.equal(closeCommand.command_type, 'close_env')
  await writeFile(path.join(responsesDirectory, 'puf-close-after-rehearsal.json'), JSON.stringify({
    status: 'completed',
    result: { message: 'Environment is shutting down' },
  }), 'utf8')

  const result = await lifecycle
  assert.equal(result.simulationId, 'sim-new')
  const artifact = JSON.parse(result.interviews)
  assert.deepEqual(artifact.interviews.map(item => item.characterId), [
    'character:gu-yao',
    'character:zhou-yan',
  ])
  assert.deepEqual(artifact.excludedProfileNames, ['护送队'])
  assert(artifact.interviews[0].response.includes('限量救治'))
} finally {
  await rm(projectPath, { recursive: true, force: true })
}

console.log('[mirofish-cli-lifecycle] PASS')
