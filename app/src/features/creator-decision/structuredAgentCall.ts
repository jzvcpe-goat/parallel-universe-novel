import type { ZodType } from 'zod'
import { CreationDecisionError } from './types'

export interface StructuredAgentAttempt {
  attempt: 'initial' | 'schema_repair'
  schemaName: string
  schemaIssues: string[]
  previousValue?: unknown
  signal?: AbortSignal
}

export interface StructuredAgentCallInput<T> {
  schemaName: string
  schema: ZodType<T>
  signal?: AbortSignal
  invoke: (attempt: StructuredAgentAttempt) => Promise<unknown>
}

function cancellationError() {
  return new CreationDecisionError('request_cancelled', 'The structured writing request was cancelled.')
}

function assertNotCancelled(signal?: AbortSignal) {
  if (signal?.aborted) throw cancellationError()
}

function decodePayload(value: unknown) {
  if (typeof value !== 'string') return { value, issues: [] as string[] }
  try {
    return { value: JSON.parse(value) as unknown, issues: [] as string[] }
  } catch {
    return { value: null, issues: ['invalid_json'] }
  }
}

function parseIssues<T>(schema: ZodType<T>, value: unknown) {
  const decoded = decodePayload(value)
  if (decoded.issues.length) return { success: false as const, issues: decoded.issues }
  const parsed = schema.safeParse(decoded.value)
  if (parsed.success) return { success: true as const, data: parsed.data }
  return {
    success: false as const,
    issues: parsed.error.issues.map(issue => `${issue.path.join('.') || 'root'}: ${issue.message}`),
  }
}

function normalizeInvocationError(error: unknown, signal?: AbortSignal): never {
  if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
    throw cancellationError()
  }
  throw error
}

export async function executeStructuredAgentCall<T>(
  input: StructuredAgentCallInput<T>,
): Promise<T> {
  assertNotCancelled(input.signal)
  let firstValue: unknown
  try {
    firstValue = await input.invoke({
      attempt: 'initial',
      schemaName: input.schemaName,
      schemaIssues: [],
      previousValue: undefined,
      signal: input.signal,
    })
  } catch (error) {
    normalizeInvocationError(error, input.signal)
  }
  assertNotCancelled(input.signal)
  const first = parseIssues(input.schema, firstValue)
  if (first.success) return first.data

  let repairedValue: unknown
  try {
    repairedValue = await input.invoke({
      attempt: 'schema_repair',
      schemaName: input.schemaName,
      schemaIssues: first.issues,
      previousValue: firstValue,
      signal: input.signal,
    })
  } catch (error) {
    normalizeInvocationError(error, input.signal)
  }
  assertNotCancelled(input.signal)
  const repaired = parseIssues(input.schema, repairedValue)
  if (repaired.success) return repaired.data

  throw new CreationDecisionError(
    'model_output_invalid',
    `Structured ${input.schemaName} output failed schema validation after one repair. Initial: ${first.issues.join('; ')}. Repair: ${repaired.issues.join('; ')}`,
  )
}
