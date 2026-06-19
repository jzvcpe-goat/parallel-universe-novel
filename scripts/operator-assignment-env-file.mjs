import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'

export const OPERATOR_ASSIGNMENT_ENV_FILE_KEY = 'REMOTE_ASSIGNMENT_ENV_FILE'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function gitCheckIgnore(root, relPath) {
  try {
    execFileSync('git', ['check-ignore', '--quiet', relPath], {
      cwd: root,
      stdio: 'ignore',
      timeout: 8000,
    })
    return true
  } catch {
    return false
  }
}

function normalizedRepoRelative(root, inputPath) {
  const absolute = isAbsolute(inputPath) ? resolve(inputPath) : resolve(root, inputPath)
  const rel = relative(root, absolute).replace(/\\/g, '/')
  assert(rel && !rel.startsWith('..') && !isAbsolute(rel), `${OPERATOR_ASSIGNMENT_ENV_FILE_KEY} must stay inside the repository`)
  return { absolute, rel }
}

function parseEnvFile(text, allowedKeys) {
  const values = {}
  const seen = new Set()
  for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    assert(!line.startsWith('export '), `operator env file line ${index + 1} must not use export`)
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line)
    assert(match, `operator env file line ${index + 1} must be KEY=value`)
    const [, key, rawValue] = match
    assert(allowedKeys.includes(key), `operator env file contains unsupported key ${key}`)
    assert(!seen.has(key), `operator env file contains duplicate key ${key}`)
    seen.add(key)
    values[key] = rawValue.trim()
  }
  return values
}

export function loadOperatorAssignmentEnvFile({ root, env = process.env, allowedKeys }) {
  assert(root, 'operator env loader requires root')
  assert(Array.isArray(allowedKeys) && allowedKeys.length > 0, 'operator env loader requires allowed keys')

  const requestedPath = String(env[OPERATOR_ASSIGNMENT_ENV_FILE_KEY] || '').trim()
  if (!requestedPath) {
    return {
      loaded: false,
      mode: 'process_env_only',
      relPath: null,
      values: {},
      effectiveEnv: env,
      providedKeys: [],
    }
  }

  const { absolute, rel } = normalizedRepoRelative(root, requestedPath)
  assert(rel.startsWith('deploy/runtime-production/'), `${OPERATOR_ASSIGNMENT_ENV_FILE_KEY} must point inside deploy/runtime-production`)
  assert(rel.endsWith('.env.local'), `${OPERATOR_ASSIGNMENT_ENV_FILE_KEY} must point to an ignored .env.local file`)
  assert(!rel.endsWith('.env.example'), `${OPERATOR_ASSIGNMENT_ENV_FILE_KEY} must not point at the tracked template`)
  assert(existsSync(absolute), `${OPERATOR_ASSIGNMENT_ENV_FILE_KEY} target does not exist: ${rel}`)
  assert(gitCheckIgnore(root, rel), `${OPERATOR_ASSIGNMENT_ENV_FILE_KEY} target must be ignored by Git: ${rel}`)

  const values = parseEnvFile(readFileSync(absolute, 'utf8'), allowedKeys)
  return {
    loaded: true,
    mode: 'local_env_file',
    relPath: rel,
    values,
    effectiveEnv: {
      ...env,
      ...values,
    },
    providedKeys: Object.keys(values),
  }
}

export function redactedOperatorEnvFileSummary(loaderResult) {
  return {
    mode: loaderResult.mode,
    loaded: loaderResult.loaded,
    path: loaderResult.relPath,
    providedKeyCount: loaderResult.providedKeys.length,
    providedKeys: loaderResult.providedKeys,
    valuesIncluded: false,
  }
}
