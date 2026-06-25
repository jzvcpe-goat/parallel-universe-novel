import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const okfBaseRelativePath = 'docs/product/knowledge/narrative-okf'
const okfCardIds = [
  'genre-kernel',
  'constraint-profile',
  'creator-socratic-flow',
  'quality-brake',
  'runtime-tool-bridge',
  'public-projection-policy',
  'market-template-refresh',
] as const

type OkfCardId = typeof okfCardIds[number]

export interface NarrativeOkfFrontmatter {
  okf_version: '1'
  kind: 'narrative.knowledge.card'
  id: OkfCardId
  title: string
  status: 'active'
  visibility: 'internal_agent_readable'
  runtime_boundary: string
  source_authority: string
  public_projection: 'redacted_story_guidance_only'
  representative_work_names: 'encrypted_vault_only'
}

export interface NarrativeOkfCard {
  id: OkfCardId
  title: string
  runtimeBoundary: string
  sourceAuthority: string
  body: string
  frontmatter: NarrativeOkfFrontmatter
}

export interface NarrativeOkfRuntimeSummary {
  version: 1
  cardCount: number
  cardIds: OkfCardId[]
  runtimeBoundaries: string[]
  visibility: 'internal_agent_readable'
  publicProjection: 'redacted_story_guidance_only'
  representativeWorkNames: 'encrypted_vault_only'
}

function findOkfBasePath(): string {
  const candidates = [join(process.cwd(), okfBaseRelativePath)]
  let current = dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 8; i += 1) {
    candidates.push(join(current, okfBaseRelativePath))
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }
  const found = candidates.find(candidate => existsSync(candidate))
  if (!found) throw new Error(`narrative OKF cards not found: ${okfBaseRelativePath}`)
  return found
}

function parseFrontmatter(text: string, fileName: string): { frontmatter: Record<string, string>; body: string } {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) throw new Error(`${fileName} must start with YAML frontmatter`)
  const frontmatter: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/)
    if (!kv) throw new Error(`${fileName} frontmatter line is not key: value: ${line}`)
    frontmatter[kv[1]] = kv[2].trim()
  }
  return { frontmatter, body: match[2].trim() }
}

function forbiddenMatches(text: string): string[] {
  const forbidden = [
    /《[^》]+》/,
    /代表作品[:：]\s*\S+/,
    /sourceRefs\s*[:=]\s*\[/,
    /source_refs\s*[:=]\s*\[/,
    /profile\.id/,
    /kernel\.id/,
    /DATABASE_URL\s*[:=]\s*(?!<)/i,
    /postgres(?:ql)?:\/\/[^<\s`]+/i,
    /SUPABASE_SERVICE_ROLE/i,
    /SERVICE_ROLE_KEY/i,
    /SUPABASE_SECRET_KEY/i,
    /SUPABASE_WRITER_PASSWORD\s*[:=]\s*(?!<)/i,
    /sk-[A-Za-z0-9_-]{10,}/,
    /eyJ[A-Za-z0-9_-]{20,}/,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function typedFrontmatter(id: OkfCardId, frontmatter: Record<string, string>): NarrativeOkfFrontmatter {
  const required = [
    'okf_version',
    'kind',
    'id',
    'title',
    'status',
    'visibility',
    'runtime_boundary',
    'source_authority',
    'public_projection',
    'representative_work_names',
  ]
  for (const key of required) {
    if (!frontmatter[key]) throw new Error(`${id}.md missing frontmatter key: ${key}`)
  }
  if (frontmatter.okf_version !== '1') throw new Error(`${id}.md okf_version must be 1`)
  if (frontmatter.kind !== 'narrative.knowledge.card') throw new Error(`${id}.md kind mismatch`)
  if (frontmatter.id !== id) throw new Error(`${id}.md id must match file name`)
  if (frontmatter.status !== 'active') throw new Error(`${id}.md status must be active`)
  if (frontmatter.visibility !== 'internal_agent_readable') throw new Error(`${id}.md visibility mismatch`)
  if (frontmatter.public_projection !== 'redacted_story_guidance_only') throw new Error(`${id}.md public projection mismatch`)
  if (frontmatter.representative_work_names !== 'encrypted_vault_only') {
    throw new Error(`${id}.md representative work names must stay encrypted only`)
  }
  return frontmatter as unknown as NarrativeOkfFrontmatter
}

export function loadNarrativeOkfCards(): NarrativeOkfCard[] {
  const basePath = findOkfBasePath()
  return okfCardIds.map(id => {
    const fileName = `${id}.md`
    const absolutePath = join(basePath, fileName)
    if (!existsSync(absolutePath)) throw new Error(`missing OKF card: ${fileName}`)
    const text = readFileSync(absolutePath, 'utf8')
    const leaks = forbiddenMatches(text)
    if (leaks.length) throw new Error(`${fileName} contains forbidden private/public-boundary text: ${leaks.join(', ')}`)
    const { frontmatter, body } = parseFrontmatter(text, fileName)
    const typed = typedFrontmatter(id, frontmatter)
    return {
      id,
      title: typed.title,
      runtimeBoundary: typed.runtime_boundary,
      sourceAuthority: typed.source_authority,
      body,
      frontmatter: typed,
    }
  })
}

export function summarizeNarrativeOkf(cards: NarrativeOkfCard[]): NarrativeOkfRuntimeSummary {
  return {
    version: 1,
    cardCount: cards.length,
    cardIds: cards.map(card => card.id),
    runtimeBoundaries: [...new Set(cards.map(card => card.runtimeBoundary))],
    visibility: 'internal_agent_readable',
    publicProjection: 'redacted_story_guidance_only',
    representativeWorkNames: 'encrypted_vault_only',
  }
}

export const narrativeOkfKnowledge = loadNarrativeOkfCards()
export const narrativeOkfRuntimeSummary = summarizeNarrativeOkf(narrativeOkfKnowledge)
