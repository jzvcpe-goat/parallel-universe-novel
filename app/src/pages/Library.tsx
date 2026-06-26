import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Filter,
  Search,
  Trophy,
} from 'lucide-react'
import { Badge } from '@/components/primitives/Badge'
import { Button } from '@/components/primitives/Button'
import { BookCard } from '@/components/design-system/BookCard'
import { Panel } from '@/components/design-system/Panel'
import { RankedWorldList } from '@/components/design-system/RankedWorldList'
import { TopicFilterBar } from '@/components/design-system/TopicFilterBar'
import { marketApi } from '@/api/market'
import { marketTrendFallback, orderTemplatesByMarketTrends, trendForTemplate } from '@/features/market/trends'
import {
  getKernelById,
  worldChapters,
  worldTemplates,
} from '@/features/parallel-universe/data'

const sortTabs = ['编辑推荐', '最近更新', '选择最多', '适合新读者']

function firstChapterTitle(worldId: string) {
  return worldChapters[worldId]?.[0]?.title || '开场章节'
}

function statusLabel(mode: string) {
  if (mode === 'flagship') return '连载中'
  if (mode === 'trial') return '短篇'
  return '故事方向'
}

export default function Library() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeSort, setActiveSort] = useState('编辑推荐')
  const [query, setQuery] = useState('')
  const [marketTrends, setMarketTrends] = useState(marketTrendFallback)

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

  const filters = useMemo(
    () => ['全部', ...marketTrends.top_categories.slice(0, 8), '连载', '短篇'],
    [marketTrends.top_categories],
  )
  const routeTopic = useMemo(
    () => new URLSearchParams(location.search).get('topic') || '全部',
    [location.search],
  )
  const activeFilter = filters.includes(routeTopic) ? routeTopic : '全部'
  const orderedWorlds = useMemo(
    () => orderTemplatesByMarketTrends(worldTemplates, marketTrends),
    [marketTrends],
  )

  function selectFilter(filter: string) {
    navigate(filter === '全部' ? '/library' : `/library?topic=${encodeURIComponent(filter)}`)
  }

  const visibleWorlds = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const filtered = orderedWorlds.filter(template => {
      const kernel = getKernelById(template.kernelId)
      const trend = trendForTemplate(marketTrends, template.id)
      const matchesQuery = !normalizedQuery
        || template.title.toLowerCase().includes(normalizedQuery)
        || template.genre.toLowerCase().includes(normalizedQuery)
        || template.tagline.toLowerCase().includes(normalizedQuery)
      const matchesFilter = activeFilter === '全部'
        || (activeFilter === '连载' && template.mode === 'flagship')
        || (activeFilter === '短篇' && template.mode !== 'flagship')
        || template.genre.includes(activeFilter)
        || kernel.category.includes(activeFilter)
        || trend.label.includes(activeFilter)
        || trend.category.includes(activeFilter)
      return matchesQuery && matchesFilter
    })

    if (activeSort === '选择最多') {
      return [...filtered].sort((a, b) => b.choiceCount - a.choiceCount)
    }
    if (activeSort === '最近更新') {
      return [...filtered].reverse()
    }
    return filtered
  }, [activeFilter, activeSort, marketTrends, orderedWorlds, query])

  const rankedWorlds = useMemo(
    () => [...orderedWorlds].sort((a, b) => b.choiceCount - a.choiceCount).slice(0, 5),
    [orderedWorlds],
  )
  const flagship = orderedWorlds.find(world => world.mode === 'flagship') || orderedWorlds[0]

  return (
    <div className="narrative-page space-y-5">
      <section className="cosmic-board p-4 md:p-5">
        <div className="relative space-y-4">
          <header className="novel-topbar">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Badge variant="gold">书城</Badge>
              <Badge variant="outline">热门题材索引</Badge>
              <Badge variant="stasis">互动连载</Badge>
            </div>
            <label className="novel-search">
              <Search size={16} className="text-[var(--ink-dim)]" />
              <input
                aria-label="搜索作品"
                placeholder="搜索作品、类型、开场事件"
                value={query}
                onChange={event => setQuery(event.target.value)}
              />
            </label>
          </header>

          <TopicFilterBar
            topics={filters}
            activeTopic={activeFilter}
            ariaLabel="热门题材索引"
            onSelect={selectFilter}
          />

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
            <main className="space-y-4">
              <section className="narrative-panel overflow-hidden p-0">
                <div
                  className="relative min-h-[260px] bg-cover bg-center p-5 md:p-6"
                  style={{
                    backgroundImage: `linear-gradient(100deg, rgba(5,9,18,0.9), rgba(5,9,18,0.58) 54%, rgba(5,9,18,0.86)), url(${flagship.coverImage})`,
                    backgroundPosition: flagship.coverPosition,
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(90,178,214,0.24),transparent_32%)]" />
                  <div className="relative max-w-2xl">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="gold">主编推荐</Badge>
                      <Badge variant="outline">{flagship.genre}</Badge>
                    </div>
                    <h1 className="mt-4 text-4xl font-semibold text-white md:text-5xl">{flagship.title}</h1>
                    <p className="mt-3 text-sm leading-7 text-white/70">{flagship.tagline}</p>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <Button variant="gold" onClick={() => navigate(`/story?world=${flagship.id}`)}>
                        <BookOpen size={16} />
                        继续阅读
                      </Button>
                    </div>
                  </div>
                </div>
              </section>

              <Panel className="p-4">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                  <div className="flex items-center gap-2">
                    <Filter className="text-[var(--worldline-cyan)]" size={18} />
                    <h2 className="text-lg font-semibold text-[var(--ink-paper)]">热门题材索引专区</h2>
                    <span className="text-sm text-[var(--ink-dim)]">{visibleWorlds.length} 本</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sortTabs.map(tab => (
                      <button
                        key={tab}
                        type="button"
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${activeSort === tab ? 'border-[var(--manuscript-gold)]/55 bg-[var(--manuscript-gold)]/12 text-[var(--manuscript-gold)]' : 'border-white/10 bg-white/[0.025] text-[var(--ink-muted)] hover:text-[var(--ink-paper)]'}`}
                        onClick={() => setActiveSort(tab)}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {visibleWorlds.map(world => {
                    const kernel = getKernelById(world.kernelId)
                    return (
                      <div key={world.id} className="rounded-lg border border-white/10 bg-white/[0.018] p-2">
                        <BookCard
                          title={world.title}
                          genre={`${statusLabel(world.mode)} · ${world.genre}`}
                          hook={`${world.tagline}｜${kernel.category}｜${firstChapterTitle(world.id)}`}
                          cover={world.coverImage}
                          choices={world.choiceCount}
                          status={world.mode === 'flagship' ? 'flagship' : 'template'}
                          ctaLabel="阅读"
                          onOpen={() => navigate(`/story?world=${world.id}`)}
                        />
                      </div>
                    )
                  })}
                </div>
              </Panel>
            </main>

            <aside className="space-y-4">
              <section className="narrative-panel p-5">
                <div className="flex items-center gap-2">
                  <Trophy className="text-[var(--manuscript-gold)]" size={18} />
                  <h2 className="text-lg font-semibold text-[var(--ink-paper)]">选择热榜</h2>
                </div>
                <RankedWorldList
                  worlds={rankedWorlds}
                  meta={world => `${world.choiceCount} 个选择 · ${world.genre}`}
                  onOpen={world => navigate(`/story?world=${world.id}`)}
                />
              </section>

              <section className="narrative-panel p-5">
                <div className="flex items-center gap-2">
                  <Clock3 className="text-[var(--worldline-cyan)]" size={18} />
                  <h2 className="text-lg font-semibold text-[var(--ink-paper)]">更新速递</h2>
                </div>
                <div className="mt-4 space-y-3">
                  {worldTemplates.map(world => (
                    <button
                      key={world.id}
                      type="button"
                      className="novel-update-row"
                      onClick={() => navigate(`/story?world=${world.id}`)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-[var(--ink-paper)]">{world.title}</span>
                        <span className="mt-1 block truncate text-xs text-[var(--ink-muted)]">{firstChapterTitle(world.id)}</span>
                      </span>
                      <ArrowRight size={14} className="text-[var(--ink-dim)]" />
                    </button>
                  ))}
                </div>
              </section>

              <section className="narrative-panel p-5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-teal-300" size={18} />
                  <h2 className="text-lg font-semibold text-[var(--ink-paper)]">读者承诺</h2>
                </div>
                <div className="mt-4 space-y-3">
                  {['5 分钟内进入第一个分歧点', '每次选择都会改变角色记忆', '正文阅读优先，复杂状态放在抽屉里'].map(item => (
                    <div key={item} className="rounded-lg border border-white/10 bg-white/[0.025] p-3 text-sm leading-6 text-[var(--ink-muted)]">
                      {item}
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </section>
        </div>
      </section>
    </div>
  )
}
