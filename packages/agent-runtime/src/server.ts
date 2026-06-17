import { createServer } from 'node:http'
import { agentContracts } from './agents.js'
import {
  agentRuntimeMeta,
  projectPublicQualityBrakeOutput,
  projectPublicSocraticCreateOutput,
  projectPublicStatePreviewOutput,
  qualityBrakeWorkflow,
  socraticCreateWorkflow,
  statePreviewWorkflow,
} from './workflows.js'

const port = Number(process.env.MASTRA_PORT || 4111)
const host = process.env.MASTRA_HOST || '127.0.0.1'

function allowedOrigins(): string[] {
  return String(process.env.MASTRA_ALLOWED_ORIGINS || '*')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
}

function corsOrigin(req: import('node:http').IncomingMessage): string {
  const configured = allowedOrigins()
  if (configured.includes('*')) return '*'
  const requestOrigin = String(req.headers.origin || '')
  if (requestOrigin && configured.includes(requestOrigin)) return requestOrigin
  return configured[0] || '*'
}

function sendJson(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, status: number, payload: unknown) {
  const origin = corsOrigin(req)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': origin,
    ...(origin === '*' ? {} : { Vary: 'Origin' }),
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,Idempotency-Key,X-NarrativeOS-Debug-Key',
  })
  res.end(JSON.stringify(payload))
}

function shouldReturnInternalPayload(req: import('node:http').IncomingMessage): boolean {
  const expected = String(process.env.MASTRA_DEBUG_RESPONSE_KEY || '').trim()
  if (!expected) return false
  const received = String(req.headers['x-narrativeos-debug-key'] || '').trim()
  return received === expected
}

async function readJson(req: import('node:http').IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return sendJson(req, res, 204, {})
    const url = new URL(req.url || '/', `http://${host}:${port}`)
    if (req.method === 'GET' && url.pathname === '/health') {
      return sendJson(req, res, 200, { status: 'ok', service: 'narrativeos-agent-runtime', ...agentRuntimeMeta })
    }
    if (req.method === 'GET' && url.pathname === '/v1/agents/contracts') {
      return sendJson(req, res, 200, { agents: agentContracts })
    }
    if (req.method === 'POST' && url.pathname === '/v1/workflows/socratic-create') {
      const body = await readJson(req)
      const output = await socraticCreateWorkflow(body)
      return sendJson(req, res, 200, shouldReturnInternalPayload(req)
        ? output
        : projectPublicSocraticCreateOutput(output))
    }
    if (req.method === 'POST' && url.pathname === '/v1/workflows/state-preview') {
      const body = await readJson(req)
      const output = await statePreviewWorkflow(body)
      return sendJson(req, res, 200, shouldReturnInternalPayload(req)
        ? output
        : projectPublicStatePreviewOutput(output))
    }
    if (req.method === 'POST' && url.pathname === '/v1/workflows/quality-brake') {
      const body = await readJson(req)
      const output = await qualityBrakeWorkflow(body)
      return sendJson(req, res, 200, shouldReturnInternalPayload(req)
        ? output
        : projectPublicQualityBrakeOutput(output))
    }
    return sendJson(req, res, 404, { code: 'not_found' })
  } catch (error) {
    return sendJson(req, res, 500, {
      code: 'agent_runtime_error',
      reason: error instanceof Error ? error.message : 'unknown_error',
    })
  }
})

server.listen(port, host, () => {
  console.log(`NarrativeOS Mastra-compatible agent runtime listening at http://${host}:${port}`)
})
