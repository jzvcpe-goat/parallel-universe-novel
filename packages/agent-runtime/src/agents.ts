import type { AgentContract, AgentType } from './types.js'

const roles: Array<[AgentType, string, string]> = [
  ['Radar', 'trend and audience signal reader', 'local-low-cost'],
  ['Planner', 'creative intent and doctrine planner', 'reasoning-high'],
  ['Orchestrator', 'context and narrative organization coordinator', 'structured-json'],
  ['Architect', 'scene and dialogue blueprint designer', 'literary-planner'],
  ['Writer', 'candidate prose writer', 'literary-writer'],
  ['Observer', 'CHANGES and state candidate extractor', 'structured-json'],
  ['Reflector', 'state update suggester', 'local-low-cost'],
  ['Normalizer', 'format, length, and public copy normalizer', 'local-low-cost'],
  ['Auditor', 'quality brake and rule auditor', 'quality-gate'],
  ['Reviser', 'candidate repair and rollback planner', 'literary-reviser'],
]

export const agentContracts: AgentContract[] = roles.map(([role, description, profile]) => ({
  agentId: `narrativeos.${role.toLowerCase()}`,
  role,
  inputSchema: {
    type: 'object',
    description: `${role} input for ${description}`,
  },
  outputSchema: {
    type: 'object',
    description: `${role} output`,
  },
  preferredModelProfile: profile,
  fallbackModelProfile: 'mock-local',
}))

