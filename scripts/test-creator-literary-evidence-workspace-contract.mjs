import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const runner = join(root, 'scripts/run-creator-literary-value-evidence-chapter-1-20.mjs')
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'creator-literary-evidence-'))
const workspace = join(temporaryDirectory, 'chapter 01-20 workspace.pufw.zip')
writeFileSync(workspace, 'fixture', 'utf8')

function run(args, env = {}) {
  return spawnSync(process.execPath, [runner, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      CREATOR_WORKSPACE_PATH: undefined,
      ...env,
    },
  })
}

try {
  const cli = run(['--workspace', workspace, '--dry-run'])
  assert.equal(cli.status, 0, cli.stderr)
  assert.equal(JSON.parse(cli.stdout).workspaceSource, 'cli')

  const environment = run(['--dry-run'], { CREATOR_WORKSPACE_PATH: workspace })
  assert.equal(environment.status, 0, environment.stderr)
  assert.equal(JSON.parse(environment.stdout).workspaceSource, 'environment')

  const missing = run(['--dry-run'])
  assert.notEqual(missing.status, 0)
  assert.match(missing.stderr, /workspace is required/)

  const privatePath = join(temporaryDirectory, 'private-author-workspace.pufw.zip')
  const unavailable = run(['--workspace', privatePath, '--dry-run'])
  assert.notEqual(unavailable.status, 0)
  assert.match(unavailable.stderr, /workspace file is unavailable/)
  assert.doesNotMatch(unavailable.stderr, /private-author-workspace/)

  const cliWins = run(['--workspace', workspace, '--dry-run'], {
    CREATOR_WORKSPACE_PATH: privatePath,
  })
  assert.equal(cliWins.status, 0, cliWins.stderr)
  assert.equal(JSON.parse(cliWins.stdout).workspaceSource, 'cli')

  const posixWithSpaces = run(['--workspace', workspace, '--dry-run'])
  assert.equal(posixWithSpaces.status, 0, posixWithSpaces.stderr)
  assert.equal(JSON.parse(posixWithSpaces.stdout).workspaceProvided, true)

  console.log('Creator literary evidence workspace contract: 6 scenarios passed')
} finally {
  rmSync(temporaryDirectory, { force: true, recursive: true })
}
