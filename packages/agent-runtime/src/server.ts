import { createServer } from 'node:http'
import { agentContracts } from './agents.js'
import { agentRuntimeMeta, socraticCreateWorkflow } from './workflows.js'

const port = Number(process.env.MASTRA_PORT || 4111)
const host = process.env.MASTRA_HOST || '127.0.0.1'

function sendJson(res: import('node:http').ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,Idempotency-Key',
  })
  res.end(JSON.stringify(payload))
}

async function readJson(req: import('node:http').IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return sendJson(res, 204, {})
    const url = new URL(req.url || '/', `http://${host}:${port}`)
    if (req.method === 'GET' && url.pathname === '/health') {
      return sendJson(res, 200, { status: 'ok', service: 'narrativeos-agent-runtime', ...agentRuntimeMeta })
    }
    if (req.method === 'GET' && url.pathname === '/v1/agents/contracts') {
      return sendJson(res, 200, { agents: agentContracts })
    }
    if (req.method === 'POST' && url.pathname === '/v1/workflows/socratic-create') {
      const body = await readJson(req)
      const output = await socraticCreateWorkflow(body)
      return sendJson(res, 200, output)
    }
    return sendJson(res, 404, { code: 'not_found' })
  } catch (error) {
    return sendJson(res, 500, {
      code: 'agent_runtime_error',
      reason: error instanceof Error ? error.message : 'unknown_error',
    })
  }
})

server.listen(port, host, () => {
  console.log(`NarrativeOS Mastra-compatible agent runtime listening at http://${host}:${port}`)
})

