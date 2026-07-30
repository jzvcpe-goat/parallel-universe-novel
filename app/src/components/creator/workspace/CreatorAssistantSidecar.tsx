import { type ReactNode, useState } from 'react'
import { Wand2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface CreatorAssistantSidecarFrameProps {
  title: string
  eyebrow: string
  secondaryLabel: string
  onClose: () => void
  children: ReactNode
  className?: string
}

export function CreatorAssistantSidecarFrame({
  title,
  eyebrow,
  secondaryLabel,
  onClose,
  children,
  className,
}: CreatorAssistantSidecarFrameProps) {
  return (
    <Card
      className={cn('creator-assistant-sidecar', className)}
      variant="glass"
      padding="none"
      role="complementary"
      aria-label="创作助手"
    >
      <CardHeader className="flex-row items-start justify-between gap-3 p-0">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="gold">{eyebrow}</Badge>
            <Badge variant="outline">{secondaryLabel}</Badge>
          </div>
          <CardTitle className="mt-3 text-xl text-[var(--creator-text)]">{title}</CardTitle>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>收起</Button>
      </CardHeader>
      <CardContent className="p-0">
        {children}
      </CardContent>
    </Card>
  )
}

export type CreatorAssistantScopeId = 'dashboard' | 'requests' | 'editor' | 'works' | 'publish' | 'settings'

export interface CreatorAssistantSidecarSurfaceProps {
  open: boolean
  scope: CreatorAssistantScopeId
  onClose: () => void
  className?: string
}

export function CreatorAssistantSidecarSurface({
  open,
  scope,
  onClose,
  className,
}: CreatorAssistantSidecarSurfaceProps) {
  const [selectedNext, setSelectedNext] = useState<{ scope: CreatorAssistantScopeId; value: string } | null>(null)
  const prompts: Record<CreatorAssistantScopeId, {
    title: string
    question: string
    why: string
    next: string[]
    path: string[]
    impact: string[]
  }> = {
    dashboard: {
      title: '今日该先写什么',
      question: '哪一条外界回声最能拉动下一次回访？',
      why: '先选一条最值得回应的回声，作者今天就能少做一次无效选择。',
      next: ['先看高热回声', '继续最近草稿', '检查待发布内容'],
      path: ['看热度', '看草稿', '选一条', '进入写作'],
      impact: ['今天的写作顺序', '读者回访机会'],
    },
    requests: {
      title: '把回声变成创作提醒',
      question: '这条回声真正想看的，是新信息、人物选择，还是支线代价？',
      why: '外界回声不是待办标题，先判断读者想看的变化，才能变成可写的一场戏。',
      next: ['提炼场景', '判断代价', '进入写作台'],
      path: ['读原话', '找欲望', '定代价', '开写'],
      impact: ['请求优先级', '章节切入点'],
    },
    editor: {
      title: '人物动机追问',
      question: '主角现在最不愿承认的动机是什么？这一段有没有把它逼出来？',
      why: '一个好追问会让正文继续往人物行动里走，而不是停在解释里。',
      next: ['补下一句', '强化冲突', '沉淀设定'],
      path: ['看当前段落', '问一个动机', '生成候选', '作者采用'],
      impact: ['下一段正文', '人物状态'],
    },
    works: {
      title: '作品结构检查',
      question: '哪条支线已有读者期待，却还缺少一个可阅读的入口章节？',
      why: '作品管理不是整理表格，而是找到最容易转化成更新的入口。',
      next: ['补支线开场', '更新作者公告', '归档低价值线'],
      path: ['看主线', '看支线', '找缺口', '安排更新'],
      impact: ['支线入口', '作者公告'],
    },
    publish: {
      title: '发布前读者视角',
      question: '读者点进来时，标题、正文和请求状态是否讲的是同一件事？',
      why: '发布前最后一次确认读者承诺，能避免标题、正文和支线入口互相脱节。',
      next: ['检查标题', '确认支线挂点', '复核请求影响'],
      path: ['看标题', '看去向', '看承诺', '确认公开'],
      impact: ['读者入口', '更新可信度'],
    },
    settings: {
      title: '写作环境整理',
      question: '当前工作区是否足够少打扰，让作者能从外界回声直接进入正文？',
      why: '本机工作区只服务一件事：让作者更快从外界回声进入可发布的正文。',
      next: ['调整显示偏好', '查看备份状态', '核对助手权限'],
      path: ['减干扰', '保存偏好', '核对备份', '回到写作'],
      impact: ['写作节奏', '界面负担'],
    },
  }
  const current = prompts[scope]
  const selectedNextValue = selectedNext?.scope === scope ? selectedNext.value : ''

  if (!open) return null

  return (
    <CreatorAssistantSidecarFrame
      title={current.title}
      eyebrow="创作导师"
      secondaryLabel="关键追问"
      onClose={onClose}
      className={className}
    >
      <div className="creator-assistant-question">
        <p className="text-xs text-[var(--creator-text-dim)]">当前追问</p>
        <p className="mt-2 text-base leading-7 text-[var(--creator-text)]">{current.question}</p>
        <small>{current.why}</small>
      </div>
      <div className="creator-assistant-pathway-wrap">
        <p>陪跑路径</p>
        <div className="creator-assistant-pathway" aria-label="陪跑路径">
          {current.path.map((item, index) => (
            <span key={item} className={index === 0 ? 'is-current' : ''}>
              <em>{index + 1}</em>
              {item}
            </span>
          ))}
        </div>
      </div>
      <div className="creator-assistant-impact" aria-label="会影响什么">
        <p>会影响</p>
        <div>
          {current.impact.map(item => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {current.next.map(item => (
          <Button
            type="button"
            key={item}
            variant={selectedNextValue === item ? 'gold' : 'outline'}
            size="sm"
            className="creator-assistant-chip"
            aria-pressed={selectedNextValue === item}
            onClick={() => setSelectedNext({ scope, value: item })}
          >
            <Wand2 size={14} />
            {item}
          </Button>
        ))}
      </div>
      {selectedNextValue ? (
        <div className="creator-assistant-feedback">
          <p>已选择：{selectedNextValue}</p>
          <span>下一步会先形成候选，仍由作者决定是否采用。</span>
        </div>
      ) : null}
    </CreatorAssistantSidecarFrame>
  )
}
