import { createHash } from 'node:crypto'
import type { AgentType, RunLedgerEntry } from './types.js'

export function stableHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex')
}

export function ledgerEntry(args: {
  runId: string
  projectId: string
  agentType: AgentType | 'Workflow'
  modelProfile?: string
  input: unknown
  output: unknown
  startedAt: number
  status?: 'ok' | 'error'
  qualityResult?: Record<string, unknown>
  stateDeltaCandidate?: Record<string, unknown>[]
}): RunLedgerEntry {
  return {
    runId: args.runId,
    projectId: args.projectId,
    agentType: args.agentType,
    modelProfile: args.modelProfile || 'mock-local',
    inputHash: stableHash(args.input),
    outputHash: stableHash(args.output),
    cost: 0,
    latency: Date.now() - args.startedAt,
    status: args.status || 'ok',
    qualityResult: args.qualityResult,
    stateDeltaCandidate: args.stateDeltaCandidate,
  }
}

