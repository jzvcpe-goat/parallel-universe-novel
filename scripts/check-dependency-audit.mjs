#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

const allowedVulnerabilities = new Map([
  ['@ai-sdk/provider-utils', {
    maxSeverity: 'low',
    reason: 'transitive_dependency_of_mastra_core_without_fixed_stable_mastra_release',
  }],
  ['@mastra/core', {
    maxSeverity: 'moderate',
    reason: 'direct_mastra_orchestration_dependency_waiting_on_upstream_fix',
  }],
  ['gray-matter', {
    maxSeverity: 'moderate',
    reason: 'transitive_dependency_of_mastra_core_without_safe_override',
  }],
  ['js-yaml', {
    maxSeverity: 'moderate',
    reason: 'transitive_dependency_of_gray_matter_under_mastra_core',
  }],
])

const severityRank = new Map([
  ['info', 0],
  ['low', 1],
  ['moderate', 2],
  ['high', 3],
  ['critical', 4],
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
  const currentRank = severityRank.get(severity)
  const maxRank = severityRank.get(expected.maxSeverity)
  if (currentRank === undefined || maxRank === undefined) {
    unexpected.push(`${name}: unrecognized severity ${severity}`)
    continue
  }
  if (currentRank > maxRank) {
    unexpected.push(`${name}: expected severity at or below ${expected.maxSeverity}, got ${severity}`)
    continue
  }
  if (severity === 'high' || severity === 'critical') {
    unexpected.push(`${name}: high/critical vulnerabilities are never allowlisted`)
    continue
  }
  allowed.push({
    name,
    severity,
    maxSeverity: expected.maxSeverity,
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
    knownAdvisorySeverityImprovement: 'allowed_when_at_or_below_classified_maximum',
    upstreamMastraChain: 'documented_and_monitored',
  },
}, null, 2))
