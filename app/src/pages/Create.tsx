import { useEffect, useMemo, useState } from 'react'
import { Compass } from 'lucide-react'
import { useLocation } from 'react-router'
import { Badge } from '@/components/primitives/Badge'
import { CreatorConversationPanel } from '@/components/design-system/CreatorConversationPanel'
import { CreatorDialogueThread } from '@/components/design-system/CreatorDialogueThread'
import { CreatorReasoningMap, type CreatorReasoningStep } from '@/components/design-system/CreatorReasoningMap'
import { CreatorStoryNotes } from '@/components/design-system/CreatorStoryNotes'
import {
  addAgentDialogueTurn,
  createAgentDialogueSession,
  creatorApi,
  localDialogueSession,
  localDialogueTurn,
  type CreatorDialogueSession,
} from '@/api/creator'
import { marketApi } from '@/api/market'
import { worldTemplates } from '@/features/parallel-universe/data'
import {
  inferTemplateIdFromStorySeed,
  marketTrendFallback,
  orderTemplatesByMarketTrends,
  trendForTemplate,
  writingToneForTrend,
} from '@/features/market/trends'
import {
  buildNovelStarterQuestions,
  novelStarterPrompt,
} from '@/features/creator/novelStarterPrompt'
import { useAuth } from '@/hooks/useAuth'

function seedExamplesFor(marketLabel: string) {
  return [
    `我想写一个${marketLabel}故事，主角一开始就被迫替别人承担后果。`,
    '第一幕是一个人收到不该存在的证据，他必须在公开和隐瞒之间选。',
    '我想要压迫感强一点，主角不是救世主，而是先被迫背锅。',
  ]
}

type StoryNoteSource = '你刚告诉我' | '我已记住' | '方向参考'
type StoryNoteTone = 'manual' | 'remembered' | 'guide'

export default function Create() {
  const location = useLocation()
  const { user } = useAuth()
  const [session, setSession] = useState<CreatorDialogueSession | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<string>('写下一句话就能开始。')
  const [marketTrends, setMarketTrends] = useState(marketTrendFallback)
  const initialTemplateId = useMemo(
    () => new URLSearchParams(location.search).get('template') || 'beacon-beyond',
    [location.search],
  )
  const resumeSessionId = useMemo(
    () => new URLSearchParams(location.search).get('session') || '',
    [location.search],
  )
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId)
  useEffect(() => {
    if (!session) setSelectedTemplateId(initialTemplateId)
  }, [initialTemplateId, session])
  const selectedTemplate = useMemo(
    () => worldTemplates.find(template => template.id === selectedTemplateId) || worldTemplates[0],
    [selectedTemplateId],
  )
  const orderedTemplates = useMemo(
    () => orderTemplatesByMarketTrends(worldTemplates, marketTrends),
    [marketTrends],
  )
  const selectedMarket = useMemo(
    () => trendForTemplate(marketTrends, selectedTemplate.id),
    [marketTrends, selectedTemplate.id],
  )
  const selectedWritingTone = writingToneForTrend(selectedMarket)
  const turns = useMemo(
    () => (Array.isArray(session?.turns) ? session.turns : []),
    [session],
  )
  function buildDialogueContext(templateId: string) {
    const template = worldTemplates.find(item => item.id === templateId) || selectedTemplate
    const market = trendForTemplate(marketTrends, template.id)
    const writingTone = writingToneForTrend(market)
    return {
      ...novelStarterPrompt.requestContext,
      story_direction: {
        label: market.label,
        tone: writingTone,
        hooks: market.hooks,
        keywords: market.keywords,
      },
      main_universe_template: {
        id: template.id,
        title: template.title,
        genre: template.genre,
        opening_premise: template.openingPremise,
        protagonist_gap: template.protagonistGap,
        first_choice_point: template.firstChoicePoint,
        audience_promise: template.audiencePromise,
      },
    }
  }

  const userTurns = useMemo(
    () => turns.filter(turn => turn.role === 'user'),
    [turns],
  )

  useEffect(() => {
    let cancelled = false
    marketApi.getTrends('weekly')
      .then(payload => {
        if (!cancelled) setMarketTrends(payload)
      })
      .catch(() => {
        if (!cancelled) setMarketTrends(marketTrendFallback)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!resumeSessionId || session?.session_id === resumeSessionId) return
    let cancelled = false
    const run = async () => {
      try {
        const restored = await creatorApi.getDialogueSession(resumeSessionId)
        if (cancelled) return
        setSession(restored)
        setNotice('已回到上次的创作草稿。回答下面的问题或继续写一句。')
      } catch {
        if (cancelled) return
        setNotice('这份草稿暂时无法恢复，可以从一句新的故事种子开始。')
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [resumeSessionId, session?.session_id])

  async function submit() {
    const message = input.trim()
    if (!message || loading) return
    setLoading(true)
    setNotice('')
    const inferredTemplateId = inferTemplateIdFromStorySeed(message, marketTrends, selectedTemplate.id)
    const activeTemplate = worldTemplates.find(template => template.id === inferredTemplateId) || selectedTemplate
    const activeMarket = trendForTemplate(marketTrends, activeTemplate.id)
    const activeWritingTone = writingToneForTrend(activeMarket)
    const activeContext = buildDialogueContext(activeTemplate.id)
    if (activeTemplate.id !== selectedTemplate.id) setSelectedTemplateId(activeTemplate.id)
    try {
      if (!session || session.session_id === 'local_creator_dialogue') {
        const request = {
          creator_id: user?.id || 'web_creator',
          seed: message,
          language: 'zh-CN',
          target_length: 'serial_novel',
          genre: activeTemplate.genre,
          tone: activeWritingTone,
          context: activeContext,
        }
        const next = await createAgentDialogueSession(request).catch(() =>
          creatorApi.createDialogueSession(request),
        )
        setSession(next)
        setNotice('开场写好了。回答下面任意一个问题，就能继续下一段。')
      } else {
        const request = {
          message,
          context: activeContext,
          previous_session: session,
        }
        const next = await addAgentDialogueTurn(session, request).catch(() =>
          creatorApi.addDialogueTurn(session.session_id, request),
        )
        setSession(next)
        setNotice('这一段可以继续扩写。')
      }
      setInput('')
    } catch {
      const next = session
        ? localDialogueTurn(session, message)
        : localDialogueSession(message)
      setSession(next)
      setInput('')
      setNotice('先用草稿继续写，不打断创作。')
    } finally {
      setLoading(false)
    }
  }

  const latestAssistant = session?.assistant
  const cards = session?.setting_cards
  const seedExamples = useMemo(
    () => seedExamplesFor(selectedMarket.label),
    [selectedMarket.label],
  )
  const openQuestions = useMemo(
    () => (cards?.open_questions?.length ? cards.open_questions : buildNovelStarterQuestions('seed')),
    [cards?.open_questions],
  )
  const followUpQuestions = useMemo(
    () => (latestAssistant?.questions?.length ? latestAssistant.questions : openQuestions).slice(0, 2),
    [latestAssistant?.questions, openQuestions],
  )
  const firstUserSeed = useMemo(() => {
    const firstTurn = userTurns.find(turn => String(turn.content || turn.message || '').trim())
    return firstTurn ? String(firstTurn.content || firstTurn.message || '').trim() : ''
  }, [userTurns])
  const storyMemory = useMemo(
    () => {
      const confirmed = cards?.confirmed || []
      return [
        {
          label: '人物',
          value: confirmed[0] || selectedTemplate.protagonistGap,
          source: confirmed[0] ? '我已记住' : '方向参考',
          tone: confirmed[0] ? 'remembered' : 'guide',
        },
        {
          label: '场景',
          value: confirmed[1] || selectedTemplate.initialLocation,
          source: confirmed[1] ? '我已记住' : '方向参考',
          tone: confirmed[1] ? 'remembered' : 'guide',
        },
        {
          label: '规则',
          value: confirmed[2] || selectedTemplate.openingPremise,
          source: confirmed[2] ? '我已记住' : '方向参考',
          tone: confirmed[2] ? 'remembered' : 'guide',
        },
        {
          label: '冲突',
          value: firstUserSeed || selectedTemplate.firstChoicePoint,
          source: firstUserSeed ? '你刚告诉我' : '方向参考',
          tone: firstUserSeed ? 'manual' : 'guide',
        },
        {
          label: '下一章钩子',
          value: confirmed[3] || selectedMarket.hooks,
          source: confirmed[3] ? '我已记住' : '方向参考',
          tone: confirmed[3] ? 'remembered' : 'guide',
        },
      ] satisfies Array<{ label: string; value: string; source: StoryNoteSource; tone: StoryNoteTone }>
    },
    [
      cards?.confirmed,
      firstUserSeed,
      selectedMarket.hooks,
      selectedTemplate.firstChoicePoint,
      selectedTemplate.initialLocation,
      selectedTemplate.openingPremise,
      selectedTemplate.protagonistGap,
    ],
  )
  const creativeReasoning = useMemo(
    () => {
      const confirmed = cards?.confirmed || []
      return [
        {
          label: '故事钩子',
          prompt: '先抓住最想让读者翻页的异常。',
          outcome: firstUserSeed || selectedTemplate.firstChoicePoint || selectedTemplate.openingPremise,
          source: firstUserSeed ? '你刚告诉我' : '方向参考',
          tone: firstUserSeed ? 'manual' : 'guide',
        },
        {
          label: '人物缺口',
          prompt: '先确定主角缺什么，再决定他能做什么。',
          outcome: confirmed[0] || selectedTemplate.protagonistGap,
          source: confirmed[0] ? '我已记住' : '方向参考',
          tone: confirmed[0] ? 'remembered' : 'guide',
        },
        {
          label: '场景压力',
          prompt: '地点要天然制造选择和代价。',
          outcome: confirmed[1] || selectedTemplate.initialLocation,
          source: confirmed[1] ? '我已记住' : '方向参考',
          tone: confirmed[1] ? 'remembered' : 'guide',
        },
        {
          label: '世界规则',
          prompt: '规则越清楚，分支越有重量。',
          outcome: confirmed[2] || selectedTemplate.openingPremise,
          source: confirmed[2] ? '我已记住' : '方向参考',
          tone: confirmed[2] ? 'remembered' : 'guide',
        },
        {
          label: '风格基调',
          prompt: '用固定气质约束句子密度、冲突节奏和章节钩子。',
          outcome: `${selectedMarket.label}：${selectedWritingTone}；${selectedMarket.hooks}`,
          source: '方向参考',
          tone: 'guide',
        },
      ] satisfies CreatorReasoningStep[]
    },
    [
      cards?.confirmed,
      firstUserSeed,
      selectedMarket.hooks,
      selectedMarket.label,
      selectedWritingTone,
      selectedTemplate.firstChoicePoint,
      selectedTemplate.initialLocation,
      selectedTemplate.openingPremise,
      selectedTemplate.protagonistGap,
    ],
  )

  return (
    <div className="narrative-page space-y-5">
      <section className="creator-shell min-h-[calc(100vh-7rem)]">
        <header className="creator-topbar creator-topbar-dialogue">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="gold">创作助手</Badge>
              <Badge variant="outline">先写再问</Badge>
              <Badge variant="outline">{selectedMarket.label}</Badge>
            </div>
            <h1 className="mt-3 text-2xl font-semibold leading-tight text-[var(--ink-paper)] md:text-3xl">
              {novelStarterPrompt.promise}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-muted)]">
              直接说一个画面、一个人物或一个冲突。创作助手先写出开场，再用一两个问题帮你把人物、场景、规则和风格基调推出来。
            </p>
          </div>
          <div className="creator-hero-context">
            <p>当前灵感方向</p>
            <strong>{selectedMarket.label}</strong>
            <span>{selectedMarket.hooks}</span>
          </div>
        </header>

        <div className="creator-grid creator-grid-dialogue">
          <main className="creator-main">
            <section className="creator-chat creator-chat-dialogue">
              <div className="flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs tracking-[0.16em] text-[var(--ink-dim)]">自然语言创作</p>
                  <h2 className="mt-1 text-2xl font-semibold text-[var(--ink-paper)]">把第一幕说出来</h2>
                </div>
                <Badge variant={session ? 'outline' : 'gold'}>
                  {session ? '继续这一幕' : '从一句话开始'}
                </Badge>
              </div>

              {!session ? (
                <div className="creator-thread creator-thread-empty">
                  <CreatorConversationPanel
                    value={input}
                    notice={notice}
                    examples={seedExamples}
                    loading={loading}
                    onChange={setInput}
                    onSubmit={() => void submit()}
                    onUseExample={setInput}
                  />
                </div>
              ) : (
                <CreatorDialogueThread
                  turns={turns}
                  questions={followUpQuestions}
                  value={input}
                  notice={notice}
                  loading={loading}
                  onChange={setInput}
                  onSubmit={() => void submit()}
                  onUseQuestion={setInput}
                />
              )}
            </section>
          </main>

          <aside className="creator-side creator-context-rail">
            <section className="narrative-panel creator-context-card p-5">
              <div className="flex items-center gap-2">
                <Compass className="text-[var(--worldline-cyan)]" size={18} />
                <h2 className="text-lg font-semibold text-[var(--ink-paper)]">灵感方向</h2>
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
                选一个你想靠近的阅读味道；真正的人物、场景和代价会在对话里长出来。
              </p>
              <div className="creator-market-pills">
                {orderedTemplates.map(template => {
                  const market = trendForTemplate(marketTrends, template.id)
                  return (
                    <button
                      key={template.id}
                      type="button"
                      className={`creator-market-pill ${selectedTemplate.id === template.id ? 'creator-market-pill-active' : ''}`}
                      onClick={() => setSelectedTemplateId(template.id)}
                    >
                      {market.label}
                    </button>
                  )
                })}
              </div>
              <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.025] p-3">
                <p className="text-sm font-semibold text-[var(--ink-paper)]">{selectedMarket.label}</p>
                <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{selectedWritingTone}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--worldline-cyan)]">{selectedMarket.keywords}</p>
              </div>
            </section>

            <CreatorReasoningMap steps={creativeReasoning} active={Boolean(session)} />
            <CreatorStoryNotes notes={storyMemory} />
          </aside>
        </div>
      </section>
    </div>
  )
}
