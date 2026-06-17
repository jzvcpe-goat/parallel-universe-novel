import { getKernelById, getTemplateById, qualityReports, worldTemplates } from './data'
import type { QualityBrakeReport, TimelineEvent, WorldBranch, WorldChoice } from './types'

function hashSeed(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash)
}

function seededUnit(seed: number, index: number): number {
  const x = Math.sin(seed + index * 97.13) * 10000
  return x - Math.floor(x)
}

function inhomogeneousRate(kernel: ReturnType<typeof getKernelById>, t: number): number {
  const chapterRamp = Math.min(1, t / 4.8)
  const climaxPulse = Math.exp(-Math.pow(t - 3.25, 2) / 1.15)
  return kernel.timeControls.baseRate
    + kernel.timeControls.burst * (0.18 * chapterRamp + 0.42 * climaxPulse)
}

function hawkesAftershock(
  kernel: ReturnType<typeof getKernelById>,
  t: number,
  acceptedEvents: number[],
): number {
  return acceptedEvents.reduce(
    (sum, eventTime) => sum + kernel.timeControls.burst * Math.exp(-kernel.timeControls.decay * (t - eventTime)),
    0,
  )
}

function deterministicPoissonCandidates(seed: number, count: number): number[] {
  const candidates: number[] = []
  let t = 0.35
  for (let index = 0; index < count * 3; index += 1) {
    const lambdaMax = 1.2
    t += -Math.log(Math.max(0.05, seededUnit(seed, index + 21))) / lambdaMax
    if (t > 5.4) break
    candidates.push(Number(t.toFixed(2)))
  }
  return candidates
}

export function simulateTimeline(templateId: string, branchId: string, choiceId?: string): TimelineEvent[] {
  const template = getTemplateById(templateId)
  const kernel = getKernelById(template.kernelId)
  const seed = hashSeed(`${templateId}:${branchId}:${choiceId || 'opening'}`)
  const labels = [
    '开场设定稳定',
    '人物压力升高',
    '伏笔成熟',
    '重大事件爆发',
    '余波写入记忆',
    '故事稳定复核',
  ]

  const candidates = deterministicPoissonCandidates(seed, labels.length)
  const acceptedEvents: number[] = []
  return labels.map((label, index) => {
    const candidateT = candidates[index] || ((index + 1) * 0.82)
    const t = Number((candidateT + seededUnit(seed, index) * 0.18).toFixed(2))
    const phaseRate = inhomogeneousRate(kernel, t)
    const aftershock = hawkesAftershock(kernel, t, acceptedEvents)
    const acceptance = Math.min(0.98, (phaseRate + aftershock) / 1.45)
    if (seededUnit(seed, index + 44) < acceptance || index === 3) acceptedEvents.push(t)
    const intensity = Math.min(100, Math.round((phaseRate + aftershock + seededUnit(seed, index + 8) * 0.18) * 72))
    const weight = Math.min(100, Math.round(intensity * (0.62 + kernel.timeControls.foreshadowPressure * 0.28)))
    const type: TimelineEvent['type'] = index === 0 ? 'setup' : index === 3 ? 'burst' : index > 3 ? 'aftershock' : 'choice'

    return {
      id: `${templateId}-${branchId}-${index}`,
      t,
      label,
      description: [
        index === 3
          ? `${template.title} 的关键冲突开始连锁发酵，下一幕会更紧。`
          : `${template.title} 的这条线索正在积累压力，暂时会先改变人物和关系。`,
        index === 3 ? '关键事件触发连锁反应，短期内新的冲突更容易出现。' : '适合继续观察，等选择更明确时再展开成正文。',
      ].join(' '),
      type,
      intensity,
      weight,
      tags: [template.genre, kernel.category, type],
    }
  })
}

export function qualityForChoice(choice?: WorldChoice): QualityBrakeReport {
  if (!choice) return qualityReports[0]
  if (choice.id.includes('publish')) return qualityReports.find(report => report.id === 'quality-public-signal') || qualityReports[0]
  return qualityReports.find(report => report.id === 'quality-hidden-survivor') || qualityReports[0]
}

export function buildHarnessStatus(choice?: WorldChoice) {
  return [
    { id: 'plan', label: '计划', detail: choice ? `已读取选择：“${choice.label}”。` : '等待读者选择第一个分歧点。', status: choice ? 'done' : 'active' },
    { id: 'draft', label: '编写初稿', detail: choice ? choice.memoryWrite : '待审片段尚未生成。', status: choice ? 'done' : 'waiting' },
    { id: 'tool', label: '运行工具', detail: choice ? choice.qualityGate : '事件节奏和故事稳定检查待触发。', status: choice ? 'done' : 'waiting' },
    { id: 'observe', label: '观察结果', detail: choice ? '质量分、伏笔压力和人物一致性已写入创作记录。' : '等待观察。', status: choice ? 'active' : 'waiting' },
    { id: 'fix', label: '补写修订', detail: choice ? '若低于门槛，保持待审并生成修复建议。' : '未开始。', status: choice ? 'waiting' : 'blocked' },
    { id: 'confirm', label: '发布确认', detail: '确认后才进入主线或分支。', status: 'blocked' },
  ] as const
}

export function flagshipTemplate() {
  return worldTemplates.find(template => template.mode === 'flagship') || worldTemplates[0]
}

export function branchStatusLabel(branch: WorldBranch): string {
  const labels: Record<WorldBranch['status'], string> = {
    canon: '主线',
    active: '已开启',
    candidate: '待确认',
    locked: '未开放',
  }
  return labels[branch.status]
}
