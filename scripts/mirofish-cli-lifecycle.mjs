import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'))
  } catch {
    return null
  }
}

async function directoryNames(root) {
  try {
    return (await readdir(root, { withFileTypes: true }))
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
  } catch {
    return []
  }
}

async function waitForJson(filePath, { child, deadline, pollIntervalMs }) {
  while (Date.now() < deadline) {
    const value = await readJson(filePath)
    if (value) return value
    if (child.exitCode !== null) break
    await sleep(pollIntervalMs)
  }
  return null
}

function interviewPrompt(character, scenario) {
  return [
    `你现在只以“${character.name}”的已给定身份回答。`,
    `场景：${scenario}`,
    '请说明：你此刻选择什么；你拒绝什么；你最担心谁误解你；这个选择愿意支付什么代价。',
    '只依据已经给定的人物状态和场景事实，不新增经历、创伤、秘密、人物或世界设定。',
    '这是临时排练回答，不是小说正文，也不是正史。',
  ].join('\n')
}

async function writeCommand(simulationDirectory, commandId, commandType, args = {}) {
  const commandsDirectory = path.join(simulationDirectory, 'ipc_commands')
  await mkdir(commandsDirectory, { recursive: true })
  await writeFile(path.join(commandsDirectory, `${commandId}.json`), JSON.stringify({
    command_id: commandId,
    command_type: commandType,
    args,
  }, null, 2), 'utf8')
}

async function closeEnvironment(simulationDirectory, child, deadline, pollIntervalMs) {
  const commandId = 'puf-close-after-rehearsal'
  await writeCommand(simulationDirectory, commandId, 'close_env')
  return waitForJson(path.join(simulationDirectory, 'ipc_responses', `${commandId}.json`), {
    child,
    deadline,
    pollIntervalMs,
  })
}

export async function snapshotMiroFishSimulationIds(projectPath) {
  return directoryNames(path.join(path.resolve(projectPath), 'uploads', 'simulations'))
}

export async function coordinateMiroFishSourceLifecycle({
  projectPath,
  knownSimulationIds,
  characters,
  scenario,
  child,
  timeoutMs = 20 * 60 * 1000,
  pollIntervalMs = 250,
}) {
  const simulationsRoot = path.join(path.resolve(projectPath), 'uploads', 'simulations')
  const known = new Set(knownSimulationIds)
  const deadline = Date.now() + timeoutMs
  let simulationDirectory = null
  let simulationId = null

  while (Date.now() < deadline && child.exitCode === null) {
    const candidates = (await directoryNames(simulationsRoot)).filter(id => !known.has(id))
    for (const candidate of candidates) {
      const candidateDirectory = path.join(simulationsRoot, candidate)
      const status = await readJson(path.join(candidateDirectory, 'env_status.json'))
      if (status?.status === 'alive') {
        simulationId = candidate
        simulationDirectory = candidateDirectory
        break
      }
    }
    if (simulationDirectory) break
    await sleep(pollIntervalMs)
  }

  if (!simulationDirectory) throw new Error('mirofish_interview_environment_unavailable')

  try {
    const profiles = await readJson(path.join(simulationDirectory, 'reddit_profiles.json'))
    if (!Array.isArray(profiles)) throw new Error('mirofish_profiles_missing')

    const selectedProfiles = characters.map(character => {
      const matches = profiles.filter(profile => profile?.name === character.name)
      if (matches.length !== 1 || !Number.isInteger(matches[0]?.user_id)) {
        throw new Error(`mirofish_selected_character_profile_invalid:${character.id}`)
      }
      return {
        characterId: character.id,
        name: character.name,
        agentId: matches[0].user_id,
      }
    })

    const commandId = 'puf-selected-character-interviews'
    await writeCommand(simulationDirectory, commandId, 'batch_interview', {
      interviews: selectedProfiles.map(profile => ({
        agent_id: profile.agentId,
        prompt: interviewPrompt(profile, scenario),
      })),
    })
    const response = await waitForJson(
      path.join(simulationDirectory, 'ipc_responses', `${commandId}.json`),
      { child, deadline, pollIntervalMs },
    )
    if (response?.status !== 'completed' || !response.result?.results) {
      throw new Error('mirofish_selected_character_interviews_failed')
    }

    const interviews = selectedProfiles.map(profile => {
      const result = response.result.results[String(profile.agentId)]
        ?? response.result.results[profile.agentId]
      const answer = typeof result?.response === 'string'
        ? result.response.trim()
        : result?.response
          ? JSON.stringify(result.response)
          : ''
      if (!answer) throw new Error(`mirofish_selected_character_interview_missing:${profile.characterId}`)
      return {
        ...profile,
        prompt: interviewPrompt(profile, scenario),
        response: answer,
        timestamp: result.timestamp ?? null,
      }
    })

    const selectedNames = new Set(selectedProfiles.map(profile => profile.name))
    return {
      simulationId,
      interviews: JSON.stringify({
        schemaVersion: 'puf-mirofish-selected-interviews.v1',
        simulationId,
        interviews,
        excludedProfileNames: profiles
          .map(profile => profile?.name)
          .filter(name => name && !selectedNames.has(name)),
      }, null, 2),
    }
  } finally {
    await closeEnvironment(simulationDirectory, child, deadline, pollIntervalMs)
  }
}
