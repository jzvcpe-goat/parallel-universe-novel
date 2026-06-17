import type { SocraticCreateInput } from './types.js'

const DEFAULT_FASTAPI_BASE_URL = 'http://127.0.0.1:8787'
const DEFAULT_TOOL_BRIDGE_TOKEN = 'dev-local-token'
const PROTECTED_DEPLOY_ENVS = new Set(['production', 'prod', 'live', 'staging', 'preview', 'remote'])

export class ToolBridgeError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
    this.name = 'ToolBridgeError'
  }
}

export function fastApiBaseUrl(): string {
  return (
    process.env.MASTRA_TOOL_BRIDGE_BASE_URL
    || process.env.FASTAPI_TOOL_BRIDGE_BASE_URL
    || DEFAULT_FASTAPI_BASE_URL
  ).replace(/\/+$/, '')
}

function deployEnv(): string {
  return String(process.env.NARRATIVEOS_DEPLOY_ENV || process.env.NODE_ENV || '').trim().toLowerCase()
}

function requiresExplicitToolBridgeToken(): boolean {
  const explicit = String(process.env.NARRATIVEOS_REQUIRE_EXPLICIT_SECRETS || '').trim().toLowerCase()
  return ['1', 'true', 'yes'].includes(explicit) || PROTECTED_DEPLOY_ENVS.has(deployEnv())
}

export function requiresToolBridgeFailClosed(): boolean {
  const explicit = String(
    process.env.MASTRA_REQUIRE_TOOL_BRIDGE
    || process.env.NARRATIVEOS_REQUIRE_TOOL_BRIDGE
    || '',
  ).trim().toLowerCase()
  return ['1', 'true', 'yes'].includes(explicit) || PROTECTED_DEPLOY_ENVS.has(deployEnv())
}

export function serviceToken(): string {
  const token = String(process.env.MASTRA_TOOL_BRIDGE_TOKEN || '').trim()
  if (requiresExplicitToolBridgeToken() && (!token || token === DEFAULT_TOOL_BRIDGE_TOKEN)) {
    throw new ToolBridgeError('tool_bridge_secret_not_configured')
  }
  return token || DEFAULT_TOOL_BRIDGE_TOKEN
}

export async function callToolBridge<T>(
  path: string,
  payload: unknown,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${fastApiBaseUrl()}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceToken()}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
      signal,
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new ToolBridgeError(`tool_bridge_unavailable:${detail}`)
  }

  if (!response.ok) {
    const body = await response.text()
    throw new ToolBridgeError(body || `tool_bridge_http_${response.status}`, response.status)
  }
  return response.json() as Promise<T>
}

export async function socraticTurnTool(
  input: SocraticCreateInput,
  runId: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  return callToolBridge('/v1/tools/runtime/socratic-turn', input, runId, signal)
}

export async function statePreviewTool(
  input: SocraticCreateInput,
  runId: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  return callToolBridge('/v1/tools/runtime/state-preview', input, runId, signal)
}

export async function qualityCheckTool(
  input: SocraticCreateInput,
  runId: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  return callToolBridge('/v1/tools/runtime/quality-check', input, runId, signal)
}
