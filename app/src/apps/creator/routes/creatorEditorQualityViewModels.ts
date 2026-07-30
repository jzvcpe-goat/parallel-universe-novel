import type { CreatorQualityIssue } from '@/components/creator/workspace/CreatorQualityPanels'
import type { PmfReaderRequest } from '@/features/pmf/types'

export type QualityIssue = CreatorQualityIssue

export function buildQualityIssues({
  content,
  title,
  destinationReady,
  linkedRequest,
}: {
  content: string
  title: string
  destinationReady: boolean
  linkedRequest: PmfReaderRequest | null
}): QualityIssue[] {
  const trimmed = content.trim()
  const hasTurn = /[？?]|却|但是|忽然|只要|除非|不能|必须/.test(trimmed)
  const issues: QualityIssue[] = []

  if (!title.trim()) {
    issues.push({
      id: 'missing-title',
      severity: 'blocker',
      title: '章节还没有名字',
      evidence: '标题栏仍是空的，读者进入作品时不知道这一章的核心异常。',
      impact: '发布后目录会失去记忆点，也会削弱下一次回访。',
      fixes: [
        {
          id: 'name-by-abnormality',
          label: '生成标题候选',
          result: '围绕本章最重要的异常给出 3 个标题。',
        },
      ],
    })
  }

  if (!destinationReady) {
    issues.push({
      id: 'missing-destination',
      severity: 'blocker',
      title: '还没决定发布到哪条线',
      evidence: '主线或 IF 支线没有确认，当前正文还找不到清楚的位置。',
      impact: '读者会分不清这是正式推进、旁支尝试，还是作者手记。',
      fixes: [
        {
          id: 'open-state',
          label: '看影响范围',
          result: '先比较主线和支线发布后会改变什么。',
        },
      ],
    })
  }

  if (!trimmed) {
    issues.push({
      id: 'empty-prose',
      severity: 'blocker',
      title: '正文还没有形成可读段落',
      evidence: '正文区仍为空，读者还看不到人物、场景和选择压力。',
      impact: '这一章无法判断节奏，也不能进入正式剧情。',
      fixes: [
        {
          id: 'draft-first-paragraph',
          label: '补写开场',
          result: '先写出一个人物正在承受选择的场面。',
        },
      ],
    })
  } else if (trimmed.length < 180) {
    issues.push({
      id: 'thin-prose',
      severity: 'warning',
      title: '段落还偏薄',
      evidence: '现在只有一小段，还没有完整呈现动作、阻碍和代价。',
      impact: '读者能看到设定，但还不一定愿意继续追下一段。',
      fixes: [
        {
          id: 'expand-beat',
          label: '补写下一段',
          result: '接着补一个动作、一个阻碍和一个代价。',
        },
        {
          id: 'tone-down',
          label: '让语气更克制',
          result: '减少解释，让场景自己说话。',
        },
      ],
    })
  }

  if (trimmed && !hasTurn) {
    issues.push({
      id: 'missing-turn',
      severity: 'suggestion',
      title: '结尾还缺一个转折',
      evidence: '段尾没有明显疑问、反差或未解释的变化。',
      impact: '读者读完会知道发生了什么，但翻页冲动还不够强。',
      fixes: [
        {
          id: 'add-hook',
          label: '加钩子',
          result: '在段尾留下一个必须继续追问的变化。',
        },
        {
          id: 'ask-cost',
          label: '追问一个代价',
          result: '把选择后果推到人物面前。',
        },
      ],
    })
  }

  if (!linkedRequest) {
    issues.push({
      id: 'self-directed-update',
      severity: 'suggestion',
      title: '这次是自主更新',
      evidence: '当前没有关联外界回声，可以继续，但要自己定义本章承诺。',
      impact: '如果承诺不清楚，后续请求和回访会更难聚焦。',
      fixes: [
        {
          id: 'clarify-promise',
          label: '补一句承诺',
          result: '明确这一章最想让读者期待什么。',
        },
      ],
    })
  }

  return issues
}
