import { createHash } from 'node:crypto'

const ENGINEERING_PATTERNS = [
  /event_id/gi,
  /seed_id/gi,
  /scene[_ -]?function/gi,
  /state[_ -]?patch/gi,
  /chapter[_ -]?plan/gi,
  /第\s*[一二三四五六七八九十\d]+\s*拍/g,
  /第\s*[一二三四五六七八九十\d]+\s*幕/g,
]

const META_PATTERNS = [
  /这一章/g,
  /本章/g,
  /接下来的剧情/g,
  /读者(?:可以|会|将)看到/g,
  /从这里起/g,
  /故事在这里/g,
]

const OVERUSED_PHRASES = [
  '不由得',
  '心中一动',
  '倒吸一口凉气',
  '嘴角勾起',
  '眼中闪过',
  '与此同时',
  '就在这时',
  '下一刻',
  '显而易见',
  '毋庸置疑',
]

function evidence(body, quote) {
  const startOffset = body.indexOf(quote)
  if (startOffset < 0) return null
  return {
    quote,
    startOffset,
    endOffset: startOffset + quote.length,
    excerptHash: createHash('sha256').update(quote).digest('hex').slice(0, 16),
  }
}

function fallbackEvidence(body, fromEnd = false) {
  const text = String(body || '')
  const firstContentOffset = text.search(/\S/u)
  if (firstContentOffset < 0) return null

  if (!fromEnd) {
    const quote = text.slice(firstContentOffset, firstContentOffset + 36)
    return evidence(text, quote)
  }

  const lastContentOffset = text.search(/\s*$/u)
  const endOffset = lastContentOffset < 0 ? text.length : lastContentOffset
  const startOffset = Math.max(firstContentOffset, endOffset - 36)
  const quote = text.slice(startOffset, endOffset)
  return evidence(text, quote)
}

function finding({ code, dimension, severity, body, quote, diagnosis, repairDirection, readerImpact }) {
  const located = evidence(body, quote) || fallbackEvidence(body)
  if (!located) return null
  return {
    code,
    dimension,
    severity,
    evidence: located,
    diagnosis,
    repairDirection,
    readerImpact,
  }
}

export function countHanCharacters(text) {
  return (String(text || '').match(/\p{Script=Han}/gu) || []).length
}

export function normalizeParagraph(text) {
  return String(text || '').replace(/[\s，。！？；：、“”‘’（）—…]/g, '')
}

export function splitParagraphs(text) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map(item => item.trim())
    .filter(Boolean)
}

function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[。！？!?])/u)
    .map(item => item.trim())
    .filter(Boolean)
}

function excerptSignature(text, fromEnd = false) {
  const normalized = normalizeParagraph(text)
  if (normalized.length < 24) return normalized
  return fromEnd ? normalized.slice(-24) : normalized.slice(0, 24)
}

export function deterministicChapterReview({ body, card, policy, state = null }) {
  const findings = []
  const hanCharacters = countHanCharacters(body)
  const paragraphs = splitParagraphs(body)
  const sentences = splitSentences(body)
  const minimum = Number(policy.minimumHanCharacters)
  const maximum = Number(policy.maximumHanCharacters)

  if (hanCharacters < minimum || hanCharacters > maximum) {
    findings.push(finding({
      code: 'Q09',
      dimension: 'pacing',
      severity: hanCharacters < Math.floor(minimum * 0.8) || hanCharacters > Math.ceil(maximum * 1.15)
        ? 'hard_block'
        : 'revision_candidate',
      body,
      quote: fallbackEvidence(body)?.quote || '',
      diagnosis: `正文汉字数为 ${hanCharacters}，目标范围是 ${minimum}-${maximum}。`,
      repairDirection: hanCharacters < minimum ? '补足场景阻力、动作后果与可感细节。' : '删除不承担叙事功能的重复解释。',
      readerImpact: hanCharacters < minimum ? '场景可能未充分展开。' : '章节可能拖慢主线推进。',
    }))
  }

  for (const pattern of ENGINEERING_PATTERNS) {
    const match = body.match(pattern)?.[0]
    if (!match) continue
    findings.push(finding({
      code: 'Q01',
      dimension: 'genre_fulfillment',
      severity: 'hard_block',
      body,
      quote: match,
      diagnosis: '正文泄漏了规划或工程词。',
      repairDirection: '把内部结构改写成场景中的动作、物件或人物判断。',
      readerImpact: '读者会从故事现场被拉回生成过程。',
    }))
  }

  for (const pattern of META_PATTERNS) {
    const match = body.match(pattern)?.[0]
    if (!match) continue
    findings.push(finding({
      code: 'Q02',
      dimension: 'exposition',
      severity: 'revision_candidate',
      body,
      quote: match,
      diagnosis: '叙述者直接解释章节功能。',
      repairDirection: '删去作者式说明，让变化由行动和后果显现。',
      readerImpact: '场景沉浸感会被元叙述打断。',
    }))
  }

  const paragraphIndex = new Map()
  for (const paragraph of paragraphs) {
    const normalized = normalizeParagraph(paragraph)
    if (normalized.length < 24) continue
    const previous = paragraphIndex.get(normalized)
    if (previous) {
      findings.push(finding({
        code: 'Q03',
        dimension: 'repetition',
        severity: 'revision_candidate',
        body,
        quote: paragraph.slice(0, Math.min(80, paragraph.length)),
        diagnosis: '正文出现近乎相同的段落。',
        repairDirection: '保留承担新因果的一段，其余改成不同动作或删除。',
        readerImpact: '重复会稀释节奏和信息密度。',
      }))
      break
    }
    paragraphIndex.set(normalized, paragraph)
  }

  const sentenceIndex = new Map()
  for (const sentence of sentences) {
    const normalized = normalizeParagraph(sentence)
    if (normalized.length < 18) continue
    const count = (sentenceIndex.get(normalized) || 0) + 1
    sentenceIndex.set(normalized, count)
    if (count === 2) {
      findings.push(finding({
        code: 'Q03',
        dimension: 'repetition',
        severity: 'revision_candidate',
        body,
        quote: sentence.slice(0, Math.min(80, sentence.length)),
        diagnosis: '正文重复使用了同一句较长表达。',
        repairDirection: '保留因果更强的一处，另一处改成新的动作、感受或信息。',
        readerImpact: '机械复句会暴露生成痕迹并降低信息密度。',
      }))
      break
    }
  }

  for (const phrase of OVERUSED_PHRASES) {
    const count = body.split(phrase).length - 1
    if (count < 3) continue
    findings.push(finding({
      code: 'Q03',
      dimension: 'freshness',
      severity: 'revision_candidate',
      body,
      quote: phrase,
      diagnosis: `模板化短语“${phrase}”在同章出现 ${count} 次。`,
      repairDirection: '把重复短语替换为人物特有的动作或现场反应。',
      readerImpact: '高频套语会抹平人物声线和场景质感。',
    }))
  }

  if (state) {
    const openingSignature = excerptSignature(body)
    const endingSignature = excerptSignature(body, true)
    if ((state.recentOpenings || []).some(item => item.signature === openingSignature)) {
      findings.push(finding({
        code: 'Q03',
        dimension: 'freshness',
        severity: 'revision_candidate',
        body,
        quote: fallbackEvidence(body)?.quote || '',
        diagnosis: '章节开头与近期已接受章节使用了相同的长文本指纹。',
        repairDirection: '从本章独有的压力、动作或感官变化进入场景。',
        readerImpact: '连续章节会显得套用同一个开场模板。',
      }))
    }
    if ((state.recentEndings || []).some(item => item.signature === endingSignature)) {
      findings.push(finding({
        code: 'Q03',
        dimension: 'freshness',
        severity: 'revision_candidate',
        body,
        quote: fallbackEvidence(body, true)?.quote || '',
        diagnosis: '章节结尾与近期已接受章节使用了相同的长文本指纹。',
        repairDirection: '让钩子由本章新后果具体到达，不复用既有收束句。',
        readerImpact: '连续阅读的结尾节奏会显得机械。',
      }))
    }
  }

  const anchorHits = (card.sensoryAnchors || []).filter(anchor => body.includes(anchor))
  if ((card.sensoryAnchors || []).length >= 3 && anchorHits.length < 2) {
    findings.push(finding({
      code: 'Q05',
      dimension: 'scene_detail',
      severity: 'revision_candidate',
      body,
      quote: fallbackEvidence(body)?.quote || '',
      diagnosis: `章节卡要求的感官锚点只落实了 ${anchorHits.length} 个。`,
      repairDirection: '在现有动作附近加入可触摸、可听见或可见的现场细节。',
      readerImpact: '场景容易停留在抽象冲突和对白层。',
    }))
  }

  const dialogueTurns = (body.match(/“[^”]{2,}”/g) || []).length
  if (paragraphs.length >= 8 && dialogueTurns === 0) {
    findings.push(finding({
      code: 'Q04',
      dimension: 'exposition',
      severity: 'revision_candidate',
      body,
      quote: fallbackEvidence(body)?.quote || '',
      diagnosis: '长场景没有可见对白回合，冲突可能主要依赖说明。',
      repairDirection: '把一处立场冲突落实为人物间的具体回应。',
      readerImpact: '人物压力和声线区分可能不足。',
    }))
  }

  const tail = body.slice(-420)
  if (tail.length > 120 && /(?:一切|所有|终于).*?(?:结束|解决|明白了)[。！]?$/s.test(tail)) {
    findings.push(finding({
      code: 'Q09',
      dimension: 'pacing',
      severity: 'revision_candidate',
      body,
      quote: fallbackEvidence(body, true)?.quote || '',
      diagnosis: '结尾呈现过早收束倾向。',
      repairDirection: '保留本章后果，同时让下一项压力在结尾具体到达。',
      readerImpact: '长篇连续阅读的牵引力会变弱。',
    }))
  }

  return {
    schemaVersion: 'deterministic-chapter-review.v1',
    hanCharacters,
    paragraphCount: paragraphs.length,
    dialogueTurns,
    sensoryAnchorHits: anchorHits,
    findings: findings.filter(Boolean),
  }
}

export function validateModelReview(body, review) {
  const validFindings = []
  const rejectedFindings = []
  for (const item of review.findings || []) {
    const located = evidence(body, item.evidenceQuote)
    if (!located) {
      rejectedFindings.push({ ...item, rejectionReason: 'evidence_not_found' })
      continue
    }
    validFindings.push({ ...item, evidence: located })
  }
  const preserveExcerpts = (review.preserveExcerpts || []).filter(excerpt => body.includes(excerpt))
  return {
    ...review,
    findings: validFindings,
    rejectedFindings,
    preserveExcerpts,
  }
}

export function reviewDecision(deterministic, modelReview) {
  const findings = [
    ...(deterministic.findings || []),
    ...(modelReview.findings || []).filter(item => item.severity !== 'preserve'),
  ]
  if (findings.some(item => item.severity === 'hard_block')) return 'block'
  if (findings.some(item => item.severity === 'revision_candidate')) return 'revise'
  return 'pass'
}

export function validateStateProposalEvidence(body, proposal) {
  const invalid = []
  for (const change of proposal.entityChanges || []) {
    if (!body.includes(change.evidenceQuote)) invalid.push(`entity:${change.entityId}:${change.field}`)
  }
  for (const change of proposal.knowledgeChanges || []) {
    if (!body.includes(change.evidenceQuote)) invalid.push(`knowledge:${change.characterId}`)
  }
  return invalid
}

export function applyEvidencePatches(body, patches, preserveExcerpts = []) {
  let next = body
  const applied = []
  const rejected = []
  for (const patch of patches || []) {
    const occurrences = next.split(patch.evidenceQuote).length - 1
    if (occurrences !== 1) {
      rejected.push({ ...patch, rejectionReason: occurrences ? 'evidence_not_unique' : 'evidence_not_found' })
      continue
    }
    if (preserveExcerpts.some(excerpt => patch.evidenceQuote.includes(excerpt) || excerpt.includes(patch.evidenceQuote))) {
      rejected.push({ ...patch, rejectionReason: 'protected_excerpt_overlap' })
      continue
    }
    if (patch.replacement.length > Math.max(900, patch.evidenceQuote.length * 4)) {
      rejected.push({ ...patch, rejectionReason: 'replacement_too_large' })
      continue
    }
    next = next.replace(patch.evidenceQuote, patch.replacement)
    applied.push(patch)
  }
  if (preserveExcerpts.some(excerpt => !next.includes(excerpt))) {
    return { body, applied: [], rejected: [...rejected, ...applied.map(item => ({ ...item, rejectionReason: 'protected_excerpt_lost' }))] }
  }
  return { body: next, applied, rejected }
}

export function initialRollingState(project, blueprint) {
  return {
    schemaVersion: 'longform-rolling-state.v1',
    projectId: project.id,
    acceptedChapterCount: 0,
    timeline: '故事开始',
    characters: Object.fromEntries(blueprint.characters.map(character => [character.id, {
      name: character.name,
      desire: character.desire,
      fear: character.fear,
      currentState: '尚未进入第一场关键选择',
      stateFacts: {},
    }])),
    knowledgeByCharacter: {},
    entityHistory: [],
    knowledgeHistory: [],
    unresolvedPromises: [],
    resolvedPromises: [],
    foreshadowing: [],
    unplannedFacts: [],
    recentSummaries: [],
    recentOpenings: [],
    recentEndings: [],
    lastChapterTail: '',
  }
}

export function normalizeRollingState(state) {
  const characters = Object.fromEntries(Object.entries(state.characters || {}).map(([id, character]) => [id, {
    ...character,
    stateFacts: { ...(character.stateFacts || {}) },
  }]))
  for (const change of state.entityHistory || []) {
    const character = characters[change.entityId]
    if (!character) continue
    if (change.field === 'currentState') character.currentState = change.after
    else character.stateFacts[change.field] = change.after
  }
  const knowledgeByCharacter = Object.fromEntries(
    Object.entries(state.knowledgeByCharacter || {}).map(([id, values]) => [id, [...values]]),
  )
  for (const change of state.knowledgeHistory || []) {
    const current = knowledgeByCharacter[change.characterId] || []
    knowledgeByCharacter[change.characterId] = addUnique(current, [change.learned]).slice(-40)
  }
  return {
    ...state,
    characters,
    knowledgeByCharacter,
    recentOpenings: [...(state.recentOpenings || [])],
    recentEndings: [...(state.recentEndings || [])],
  }
}

function addUnique(list, values) {
  return Array.from(new Set([...(list || []), ...(values || [])].filter(Boolean)))
}

function removeValues(list, values) {
  const removed = new Set(values || [])
  return (list || []).filter(item => !removed.has(item))
}

export function commitAcceptedChapter(state, draft) {
  const normalizedState = normalizeRollingState(state)
  const proposal = draft.stateProposal
  const unresolved = addUnique(
    removeValues(normalizedState.unresolvedPromises, proposal.promisesResolved),
    proposal.promisesCreated,
  )
  const foreshadowing = addUnique(
    removeValues(normalizedState.foreshadowing, proposal.foreshadowingResolved),
    proposal.foreshadowingCreated,
  )
  const nextState = {
    ...normalizedState,
    acceptedChapterCount: draft.chapterNumber,
    timeline: proposal.timelineAdvance,
    entityHistory: [...normalizedState.entityHistory, ...proposal.entityChanges].slice(-80),
    knowledgeHistory: [...normalizedState.knowledgeHistory, ...proposal.knowledgeChanges].slice(-80),
    unresolvedPromises: unresolved,
    resolvedPromises: addUnique(normalizedState.resolvedPromises, proposal.promisesResolved),
    foreshadowing,
    unplannedFacts: addUnique(normalizedState.unplannedFacts, proposal.unplannedFacts).slice(-60),
    recentSummaries: [...normalizedState.recentSummaries, {
      chapterNumber: draft.chapterNumber,
      title: draft.title,
      summary: draft.sceneSummary,
      focalChoice: draft.focalChoice,
      cost: draft.irreversibleCost,
    }].slice(-5),
    recentOpenings: [...(normalizedState.recentOpenings || []), {
      chapterNumber: draft.chapterNumber,
      signature: excerptSignature(draft.body),
    }].slice(-12),
    recentEndings: [...(normalizedState.recentEndings || []), {
      chapterNumber: draft.chapterNumber,
      signature: excerptSignature(draft.body, true),
    }].slice(-12),
    lastChapterTail: draft.body.slice(-600),
  }
  return normalizeRollingState(nextState)
}

export function assertBlueprint(project, blueprint, options = {}) {
  const errors = []
  const reservedCharacterNames = new Set(options.reservedCharacterNames || [])
  if (blueprint.projectId !== project.id) errors.push('project_id_mismatch')
  if (blueprint.arcs?.length !== 10) errors.push('arc_count_mismatch')
  if (new Set((blueprint.characters || []).map(item => item.id)).size !== blueprint.characters?.length) errors.push('duplicate_character_id')
  if (!blueprint.characters?.some(character => character.name === project.protagonistName)) errors.push('protagonist_name_mismatch')
  for (const character of blueprint.characters || []) {
    if (reservedCharacterNames.has(character.name)) errors.push(`reserved_character_name:${character.name}`)
  }
  for (let index = 0; index < 10; index += 1) {
    const arc = blueprint.arcs?.[index]
    if (!arc || arc.number !== index + 1 || arc.chapterStart !== index * 10 + 1 || arc.chapterEnd !== (index + 1) * 10) {
      errors.push(`invalid_arc_range:${index + 1}`)
    }
  }
  if (errors.length) throw new Error(`invalid_story_blueprint:${errors.join(',')}`)
}

export function assertArcChapters(projectId, arcNumber, arcPlan, blueprint) {
  const errors = []
  if (arcPlan.projectId !== projectId) errors.push('project_id_mismatch')
  if (arcPlan.arcNumber !== arcNumber) errors.push('arc_number_mismatch')
  if (arcPlan.chapters?.length !== 10) errors.push('chapter_count_mismatch')
  const characterIds = new Set(blueprint.characters.map(item => item.id))
  const locationIds = new Set(blueprint.locations.map(item => item.id))
  const titles = new Set()
  const conflicts = new Set()
  const choices = new Set()
  const endingHooks = new Set()
  const start = (arcNumber - 1) * 10 + 1
  for (let index = 0; index < 10; index += 1) {
    const card = arcPlan.chapters?.[index]
    if (!card || card.number !== start + index) errors.push(`invalid_chapter_number:${start + index}`)
    if (card && !characterIds.has(card.povCharacterId)) errors.push(`unknown_pov:${card.povCharacterId}`)
    if (card && !locationIds.has(card.locationId)) errors.push(`unknown_location:${card.locationId}`)
    if (!card) continue
    const titleKey = normalizeParagraph(card.title)
    const conflictKey = normalizeParagraph(card.conflict)
    const choiceKey = normalizeParagraph(card.requiredChoice)
    const hookKey = normalizeParagraph(card.endingHook)
    if (titles.has(titleKey)) errors.push(`duplicate_title:${card.number}`)
    if (conflicts.has(conflictKey)) errors.push(`duplicate_conflict:${card.number}`)
    if (choices.has(choiceKey)) errors.push(`duplicate_choice:${card.number}`)
    if (endingHooks.has(hookKey)) errors.push(`duplicate_ending_hook:${card.number}`)
    if (index > 0 && arcPlan.chapters[index - 1]?.locationId === card.locationId) {
      errors.push(`consecutive_location:${card.number}`)
    }
    titles.add(titleKey)
    conflicts.add(conflictKey)
    choices.add(choiceKey)
    endingHooks.add(hookKey)
  }
  if (errors.length) throw new Error(`invalid_arc_chapters:${errors.join(',')}`)
}
