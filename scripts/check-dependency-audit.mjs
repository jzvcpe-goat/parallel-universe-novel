#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

const allowedVulnerabilities = new Map([
  ['@ai-sdk/provider-utils', {
    severity: 'low',
    reason: 'transitive_dependency_of_mastra_core_without_fixed_stable_mastra_release',
  }],
  ['@mastra/core', {
    severity: 'moderate',
    reason: 'direct_mastra_orchestration_dependency_waiting_on_upstream_fix',
  }],
  ['gray-matter', {
    severity: 'moderate',
    reason: 'transitive_dependency_of_mastra_core_without_safe_override',
  }],
  ['js-yaml', {
    severity: 'moderate',
    reason: 'transitive_dependency_of_gray_matter_under_mastra_core',
  }],
])

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const result = spawnSync('npm', ['audit', '--audit-level=moderate', '--json'], {
  encoding: 'utf8',
})

let report
try {
  report = JSON.parse(result.stdout || '{}')
} catch (error) {
  throw new Error(`Unable to parse npm audit JSON: ${error instanceof Error ? error.message : String(error)}`)
}

const vulnerabilities = report.vulnerabilities || {}
const unexpected = []
const allowed = []

for (const [name, detail] of Object.entries(vulnerabilities)) {
  const expected = allowedVulnerabilities.get(name)
  if (!expected) {
    unexpected.push(`${name}: unexpected vulnerability`)
    continue
  }
  const severity = String(detail.severity || '')
  if (severity !== expected.severity) {
    unexpected.push(`${name}: expected severity ${expected.severity}, got ${severity}`)
    continue
  }
  if (severity === 'high' || severity === 'critical') {
    unexpected.push(`${name}: high/critical vulnerabilities are never allowlisted`)
    continue
  }
  allowed.push({
    name,
    severity,
    reason: expected.reason,
  })
}

for (const name of allowedVulnerabilities.keys()) {
  if (!vulnerabilities[name]) {
    continue
  }
  assert(allowed.some(item => item.name === name), `${name} must be classified if present`)
}

assert(
  unexpected.length === 0,
  `dependency audit contains unapproved vulnerabilities:\n- ${unexpected.join('\n- ')}`,
)

console.log(JSON.stringify({
  status: allowed.length ? 'passed_with_known_upstream_mastra_advisories' : 'passed',
  allowed,
  policy: {
    highOrCritical: 'blocked',
    newModerateOrLow: 'blocked_until_classified',
    upstreamMastraChain: 'documented_and_monitored',
  },
}, null, 2))
