import type { SocraticCreateInput } from './types.js'

const DEFAULT_FASTAPI_BASE_URL = 'http://127.0.0.1:8787'

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

export function serviceToken(): string {
  return process.env.MASTRA_TOOL_BRIDGE_TOKEN || 'dev-local-token'
}

export async function callToolBridge<T>(
  path: string,
  payload: unknown,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${fastApiBaseUrl()}${path}`, {
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
