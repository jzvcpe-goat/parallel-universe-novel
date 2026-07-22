import type { AuthorIntentContract } from '@/features/creator-decision/types'
import type { PmfLocalSettingAsset, PmfReaderRequest } from '@/features/pmf/types'

export interface CreatorEditorIntentSeedInput {
  settingAssets: PmfLocalSettingAsset[]
  linkedRequest: PmfReaderRequest | null
  storySeed?: string
  currentIntent?: AuthorIntentContract | null
}

function cleanClause(value: string) {
  return value
    .trim()
    .replace(/^[，。；：:、\s]+|[，。；：:、\s]+$/gu, '')
}

const explicitIntentLabels = ['人物选择', '必须变化', '可见代价'] as const
const explicitIntentBoundaryLabels = [
  ...explicitIntentLabels,
  '时间线',
  '边界',
  '限制',
  '补充',
] as const

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function explicitIntentClause(seed: string, label: typeof explicitIntentLabels[number]) {
  const labels = explicitIntentBoundaryLabels.map(escapeRegExp).join('|')
  const match = seed.match(new RegExp(
    `${escapeRegExp(label)}\\s*[：:]\\s*([\\s\\S]+?)(?=(?:${labels})\\s*[：:]|结尾(?:要求)?\\s*(?:[：:]|不要|不能|不得)|$)`,
    'u',
  ))
  return cleanClause(match?.[1] || '')
}

function sceneActionFrom(seed: string, actorName: string) {
  const explicitChoice = explicitIntentClause(seed, '人物选择')
  if (explicitChoice) return explicitChoice

  const keyChoice = seed.match(
    /关键选择是\s*[：:]\s*[^。；]*?(?:就得|只能)\s*(.+?)(?=[。；]|$)/u,
  )
  if (keyChoice) return cleanClause(keyChoice[1])

  const actorPattern = [actorName, '主角', '他', '她']
    .filter(Boolean)
    .map(escapeRegExp)
    .join('|')
  const decisiveChoice = seed.match(new RegExp(
    `(?:${actorPattern})(选择|决定|坚持|拒绝|宁可|主动)(.+?)(?=，?\\s*(?:并?以)[^。；]+?为代价|[。；]|$)`,
    'u',
  ))
  if (decisiveChoice) {
    const decisionVerb = decisiveChoice[1]
    const semanticVerb = /^(?:坚持|拒绝|宁可|主动)$/u.test(decisionVerb) ? decisionVerb : ''
    return `${actorName}${semanticVerb}${cleanClause(decisiveChoice[2])}`
  }

  const explicitAction = seed.match(
    /(?:必须|需要|将要|(?:他|她|主角)\s*要)\s*(?!不能|不得|不要|暂不)(.+?)(?=，\s*(?:代价(?:是|为|：|:)|但(?:不能|不得|不要|暂不)|不能|不得|不要|暂不)|[。；]|$)/u,
  )
  if (explicitAction) {
    return cleanClause(explicitAction[1])
      .replace(/^(?:他|她|他们|她们|主角)(?:要|必须|需要|将要)?/u, '')
      .replace(/^(?:要|必须|需要|将要)/u, '')
      .trim()
  }

  const constrainedChoice = seed.match(new RegExp(
    `(?:${actorPattern})[^。；]{0,96}?(只能|只得|不得不)\\s*(.+?)(?=[。；]|$)`,
    'u',
  ))
  if (constrainedChoice) {
    return `${actorName}${constrainedChoice[1]}${cleanClause(constrainedChoice[2])}`
  }

  const chapterAction = seed.match(
    /(?:这一场|本场|这一章|本章)(?:里|中)?(.+?)(?=，\s*(?:代价(?:是|为|：|:)|但(?:不能|不得|不要|暂不)|不能|不得|不要|暂不)|[。；]|$)/u,
  )
  if (!chapterAction) return ''
  const action = cleanClause(chapterAction[1])
    .replace(/^(?:他|她|他们|她们|主角)(?:要|必须|需要|将要)?/u, '')
    .replace(/^(?:要|必须|需要|将要)/u, '')
    .trim()
  return /^(?:不能|不得|不要|暂不)/u.test(action) ? '' : action
}

function primaryCharacterName(asset: PmfLocalSettingAsset | undefined) {
  if (!asset) return '主角'
  const source = asset.title.trim().replace(/^人物\s*[·：:]\s*/u, '')
  return source.match(/^[^，,。；;：:\s]{1,24}/u)?.[0] || source || '主角'
}

function characterSignalIndex(seed: string, asset: PmfLocalSettingAsset) {
  const name = primaryCharacterName(asset)
  if (!name || name === '主角') return Number.POSITIVE_INFINITY
  const actorSignal = seed.match(new RegExp(
    `${escapeRegExp(name)}\\s*(?:选择|决定|坚持|拒绝|宁可|主动|必须|需要|只能|只得|不得不|不能|不得|要)`,
    'u',
  ))
  return actorSignal?.index ?? Number.POSITIVE_INFINITY
}

function selectPrimaryCharacter(input: CreatorEditorIntentSeedInput, prompt: string) {
  const characters = input.settingAssets.filter(asset => asset.kind === 'character')
  if (!characters.length) return undefined

  const signalled = characters
    .map(asset => ({ asset, index: characterSignalIndex(prompt, asset) }))
    .filter(candidate => Number.isFinite(candidate.index))
    .sort((left, right) => left.index - right.index)[0]?.asset
  if (signalled) return signalled

  const currentActor = input.currentIntent?.characterAgency.primaryActorId
    ? characters.find(asset => asset.localAssetRef === input.currentIntent?.characterAgency.primaryActorId)
    : undefined
  if (currentActor) return currentActor

  const mentioned = characters
    .map(asset => ({ asset, index: prompt.indexOf(primaryCharacterName(asset)) }))
    .filter(candidate => candidate.index >= 0)
    .sort((left, right) => left.index - right.index)[0]?.asset
  return mentioned || characters[0]
}

function visibleCostFrom(seed: string) {
  const explicitCost = explicitIntentClause(seed, '可见代价')
  if (explicitCost) return explicitCost
  const statedCost = seed.match(/代价(?:是|为|：|:)\s*([^，。；]+)/u)
  if (statedCost) return cleanClause(statedCost[1])
  const paidCost = seed.match(/(?:并?以)\s*(.+?)\s*为代价/u)
  return cleanClause(paidCost?.[1] || '').replace(/^自己承担/u, '承担')
}

function narrativeChangeFrom(seed: string, requiredChoice: string) {
  const explicitChange = explicitIntentClause(seed, '必须变化')
  if (explicitChange) return explicitChange
  const demonstratedChange = seed.match(
    /(?:证明|确认|发现|揭示)\s*(.+?)(?=[。；]|，\s*(?:只能|不能|不得|不要|暂不)|$)/u,
  )
  if (demonstratedChange) return `证明${cleanClause(demonstratedChange[1])}`
  const counterpartChange = requiredChoice.match(/(?:说服|迫使|促使|让)\s*(.+)$/u)
  if (counterpartChange) return cleanClause(counterpartChange[1])
  return requiredChoice
}

function delayedRevealFrom(seed: string) {
  const match = seed.match(
    /(?:但|且)?(?:不能|不得|不要|暂不)(?:在本场)?(?:揭晓|揭示|解释|说明|公开|说破|推断)\s*([^，。；]+)/u,
  )
  return cleanClause(match?.[1] || '')
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(cleanClause).filter(Boolean)))
}

export function buildCreatorEditorIntentSeed(
  input: CreatorEditorIntentSeedInput,
): Partial<AuthorIntentContract> {
  const linkedPrompt = input.linkedRequest?.request_text.trim() || ''
  const authorSeed = input.storySeed?.trim() || ''
  const prompt = authorSeed || linkedPrompt
  const primaryCharacter = selectPrimaryCharacter(input, prompt)
  const source = authorSeed ? 'author_explicit' as const : 'existing_outline' as const
  const actorName = primaryCharacterName(primaryCharacter)
  const sceneAction = sceneActionFrom(prompt, actorName)
  const visibleCost = visibleCostFrom(prompt)
  const delayedReveal = delayedRevealFrom(prompt)
  const requiredChoice = sceneAction
    ? sceneAction.includes(actorName)
      ? sceneAction
      : `${actorName}必须${sceneAction}`
    : ''
  const mustChange = narrativeChangeFrom(prompt, requiredChoice)
  const readerConfirmation = requiredChoice
    ? visibleCost
      ? `确认${requiredChoice}，并看见${visibleCost}`
      : `确认${requiredChoice}已经改变局面`
    : ''

  const fieldSources: AuthorIntentContract['fieldSources'] = {}
  if (prompt) fieldSources['boundaries.requiredElements'] = source
  if (requiredChoice) {
    fieldSources['characterAgency.requiredChoice'] = source
    fieldSources['characterAgency.currentGoal'] = source
    fieldSources['readerExperience.targetEmotion'] = source
  }
  if (mustChange) fieldSources['narrativeDelta.mustChange'] = source
  if (visibleCost) fieldSources['characterAgency.expectedCost'] = source
  if (delayedReveal) {
    fieldSources['narrativeDelta.mustNotResolve'] = source
    fieldSources['informationPolicy.delayedReveals'] = source
    fieldSources['boundaries.forbiddenEffects'] = source
  }

  const nextSeed: Partial<AuthorIntentContract> = {
    readerExperience: {
      startEmotion: '',
      targetEmotion: readerConfirmation,
      emotionalMovement: readerConfirmation ? '从不确定走向确认，同时保留未揭晓信息' : '',
      intensity: 'restrained',
    },
    narrativeDelta: {
      startingCondition: '',
      endingCondition: mustChange,
      mustChange,
      mustNotResolve: delayedReveal ? [`揭晓${delayedReveal}`] : [],
      irreversibleChange: visibleCost || null,
    },
    characterAgency: {
      primaryActorId: primaryCharacter?.localAssetRef || 'protagonist',
      currentGoal: requiredChoice || primaryCharacter?.summary || prompt,
      requiredChoice,
      opposingForce: prompt,
      expectedCost: visibleCost,
    },
    informationPolicy: {
      readerShouldKnow: unique([requiredChoice, visibleCost]),
      readerShouldSuspect: delayedReveal ? [`${delayedReveal}仍被刻意保留`] : [],
      charactersMustNotKnow: [],
      delayedReveals: delayedReveal ? [delayedReveal] : [],
    },
    boundaries: {
      requiredElements: unique([prompt, sceneAction, visibleCost]),
      forbiddenEffects: delayedReveal ? [`提前揭晓${delayedReveal}`] : [],
      protectedCharacterTraits: primaryCharacter?.tags || [],
    },
    fieldSources,
    agentAssumptions: primaryCharacter
      ? [`暂以“${actorName}”作为本场主要行动者，作者可以在锁定前调整。`]
      : [prompt
          ? '暂以故事种子中的核心人物作为本场主要行动者，作者可以在锁定前调整。'
          : '暂以主角作为本场主要行动者，作者可以在锁定前调整。'],
  }

  if (!input.currentIntent) return nextSeed

  const current = input.currentIntent
  return {
    readerExperience: {
      ...current.readerExperience,
      ...nextSeed.readerExperience,
      targetEmotion: nextSeed.readerExperience?.targetEmotion || current.readerExperience.targetEmotion,
      emotionalMovement: nextSeed.readerExperience?.emotionalMovement || current.readerExperience.emotionalMovement,
    },
    narrativeDelta: {
      ...current.narrativeDelta,
      ...nextSeed.narrativeDelta,
      endingCondition: nextSeed.narrativeDelta?.endingCondition || current.narrativeDelta.endingCondition,
      mustChange: nextSeed.narrativeDelta?.mustChange || current.narrativeDelta.mustChange,
      mustNotResolve: nextSeed.narrativeDelta?.mustNotResolve.length
        ? nextSeed.narrativeDelta.mustNotResolve
        : current.narrativeDelta.mustNotResolve,
      irreversibleChange: nextSeed.narrativeDelta?.irreversibleChange || current.narrativeDelta.irreversibleChange,
    },
    characterAgency: {
      ...current.characterAgency,
      ...nextSeed.characterAgency,
      currentGoal: nextSeed.characterAgency?.currentGoal || current.characterAgency.currentGoal,
      requiredChoice: nextSeed.characterAgency?.requiredChoice || current.characterAgency.requiredChoice,
      opposingForce: current.characterAgency.opposingForce || nextSeed.characterAgency?.opposingForce || '',
      expectedCost: nextSeed.characterAgency?.expectedCost || current.characterAgency.expectedCost,
    },
    informationPolicy: {
      ...current.informationPolicy,
      ...nextSeed.informationPolicy,
      readerShouldKnow: unique([
        ...current.informationPolicy.readerShouldKnow,
        ...(nextSeed.informationPolicy?.readerShouldKnow || []),
      ]),
      readerShouldSuspect: nextSeed.informationPolicy?.readerShouldSuspect.length
        ? nextSeed.informationPolicy.readerShouldSuspect
        : current.informationPolicy.readerShouldSuspect,
      charactersMustNotKnow: current.informationPolicy.charactersMustNotKnow,
      delayedReveals: nextSeed.informationPolicy?.delayedReveals.length
        ? nextSeed.informationPolicy.delayedReveals
        : current.informationPolicy.delayedReveals,
    },
    boundaries: {
      requiredElements: unique([
        ...current.boundaries.requiredElements,
        ...(nextSeed.boundaries?.requiredElements || []),
      ]),
      forbiddenEffects: unique([
        ...current.boundaries.forbiddenEffects,
        ...(nextSeed.boundaries?.forbiddenEffects || []),
      ]),
      protectedCharacterTraits: unique([
        ...current.boundaries.protectedCharacterTraits,
        ...(nextSeed.boundaries?.protectedCharacterTraits || []),
      ]),
    },
    fieldSources: {
      ...current.fieldSources,
      ...nextSeed.fieldSources,
    },
    lockedFields: [],
    agentAssumptions: nextSeed.agentAssumptions || current.agentAssumptions,
  }
}
