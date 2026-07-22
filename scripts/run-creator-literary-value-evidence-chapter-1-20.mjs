import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { isAbsolute } from 'node:path'

const defaultContinuityReceipt = 'validation/creator-ui/conversation-recall-2026-07-14/chapter-01-20-continuity-current-workspace-2026-07-18/summary.json'
const defaultLongRangeReceipt = 'validation/creator-ui/conversation-recall-2026-07-14/chapter-01-20-long-range-story-threads-reconciled-2026-07-16/summary.json'
const defaultOutput = 'artifacts/local/creator-writing/literary-value-evidence.json'

function fail(message) {
  process.stderr.write(`Creator literary evidence validation failed: ${message}\n`)
  process.exitCode = 1
}

function redact(value, workspace) {
  return value.split(workspace).join('<workspace>')
}

function hasOption(args, option) {
  return args.some(arg => arg === option || arg.startsWith(`${option}=`))
}

let cliWorkspace
let dryRun = false
const forwarded = []

for (let index = 0; index < process.argv.slice(2).length; index += 1) {
  const argument = process.argv.slice(2)[index]
  if (argument === '--workspace') {
    cliWorkspace = process.argv.slice(2)[index + 1]
    index += 1
    continue
  }
  if (argument.startsWith('--workspace=')) {
    cliWorkspace = argument.slice('--workspace='.length)
    continue
  }
  if (argument === '--dry-run') {
    dryRun = true
    continue
  }
  forwarded.push(argument)
}

const workspace = cliWorkspace || process.env.CREATOR_WORKSPACE_PATH
const workspaceSource = cliWorkspace ? 'cli' : process.env.CREATOR_WORKSPACE_PATH ? 'environment' : null

if (!workspace) {
  fail('a workspace is required. Pass --workspace <path> or set CREATOR_WORKSPACE_PATH.')
} else if (!isAbsolute(workspace)) {
  fail('the workspace must be an absolute path.')
} else if (!existsSync(workspace)) {
  fail('the workspace file is unavailable.')
} else if (dryRun) {
  process.stdout.write(`${JSON.stringify({ workspaceSource, workspaceProvided: true })}\n`)
} else {
  const validatorArgs = [
    '--import',
    'tsx',
    'scripts/validate-creator-literary-value-evidence.mts',
    '--workspace',
    workspace,
    ...forwarded,
  ]

  if (!hasOption(forwarded, '--continuity-receipt')) {
    validatorArgs.push('--continuity-receipt', defaultContinuityReceipt)
  }
  if (!hasOption(forwarded, '--long-range-receipt')) {
    validatorArgs.push('--long-range-receipt', defaultLongRangeReceipt)
  }
  if (!hasOption(forwarded, '--output')) {
    validatorArgs.push('--output', defaultOutput)
  }

  const result = spawnSync(process.execPath, validatorArgs, {
    encoding: 'utf8',
    env: process.env,
  })
  const stdout = redact(result.stdout || '', workspace)
  const stderr = redact(result.stderr || '', workspace)
  if (stdout) process.stdout.write(stdout)
  if (stderr) process.stderr.write(stderr)
  if (result.error) {
    fail('the local validator could not start.')
  } else if (result.status !== 0) {
    process.exitCode = result.status || 1
  }
}
