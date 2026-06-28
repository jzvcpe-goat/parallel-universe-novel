import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Clock3,
  Feather,
  Flame,
  Library,
  Search,
  Sparkles,
  Trophy,
  UserRound,
} from 'lucide-react'
import { Badge } from '@/components/primitives/Badge'
import { Button } from '@/components/primitives/Button'
import { BookCard } from '@/components/design-system/BookCard'
import { Panel } from '@/components/design-system/Panel'
import { RankedWorldList } from '@/components/design-system/RankedWorldList'
import { TopicFilterBar } from '@/components/design-system/TopicFilterBar'
import { marketApi } from '@/api/market'
import { marketTrendFallback, orderTemplatesByMarketTrends } from '@/features/market/trends'
import { worldChapters, worldTemplates } from '@/features/parallel-universe/data'
import type { WorldTemplate } from '@/features/parallel-universe/types'

const flagship = worldTemplates.find(world => world.id === 'beacon-beyond') || worldTemplates[0]

const topNav = ['精选', '排行', '分类', '完本', '新章']

const heroStats = [
  { label: '本周阅读', value: '18.6k' },
  { label: '完成选择', value: '42k' },
  { label: '收藏增长', value: '31%' },
]

const editorSpotlights = [
  {
    title: '公开灯码',
    detail: '真相立刻扩散，雾港议会和王庭都会提前入局。',
    tag: '本章高热',
  },
  {
    title: '藏起名册',
    detail: '先救幸存者，角色信任会被写进下一章代价。',
    tag: '分支最快',
  },
  {
    title: '追问旧名',
    detail: '父亲旧名从伏笔变成证据，第七灯塔线提前收束。',
    tag: '强剧情',
  },
]

function firstChapter(templateId: string) {
  return worldChapters[templateId]?.[0]
}

function coverStyle(world: WorldTemplate) {
  return {
    backgroundImage: `linear-gradient(180deg, rgba(5,9,18,0.02), rgba(5,9,18,0.72)), url(${world.coverImage})`,
    backgroundPosition: world.coverPosition,
  }
}

function libraryTopicPath(topic: string) {
  return `/library?topic=${encodeURIComponent(topic)}`
}

export default function Home() {
  const navigate = useNavigate()
  const [activeRank, setActiveRank] = useState('热读榜')
  const [marketTrends, setMarketTrends] = useState(marketTrendFallback)
  const recommendedWorlds = useMemo(
    () => orderTemplatesByMarketTrends(worldTemplates, marketTrends),
    [marketTrends],
  )
  const rankedWorlds = useMemo(() => recommendedWorlds.slice(0, 5), [recommendedWorlds])
  const latestRows = useMemo(() => recommendedWorlds.slice(0, 8), [recommendedWorlds])
  const categories = useMemo(
    () => marketTrends.top_categories.slice(0, 8),
    [marketTrends],
  )
  const trendBlocks = useMemo(
    () => marketTrends.trends.slice(0, 6),
    [marketTrends],
  )
  const channelShelves = useMemo(
    () => [
      { title: '本周热门方向', worlds: recommendedWorlds.slice(0, 3) },
      { title: '适合开新书', worlds: [...recommendedWorlds].reverse().slice(0, 3) },
    ],
    [recommendedWorlds],
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

  const goNav = () => navigate('/library')

  return (
    <div className="narrative-page commercial-home-page">
      <section className="commercial-gateway cosmic-board p-4 md:p-5">
        <div className="relative space-y-4">
          <header className="commercial-topbar">
            <button
              type="button"
              className="commercial-brand"
              onClick={() => navigate('/')}
              aria-label="返回首页"
            >
              <span className="commercial-brand-mark">
                <Sparkles size={20} />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold text-[var(--ink-paper)]">平行宇宙小说</span>
                <span className="mt-0.5 block text-xs text-[var(--ink-dim)]">可选择故事书城</span>
              </span>
            </button>

            <nav className="commercial-site-nav" aria-label="站点导航">
              {topNav.map(item => (
                <button
                  key={item}
                  type="button"
                  className={item === '精选' ? 'commercial-site-nav-active' : ''}
                  onClick={goNav}
                >
                  {item}
                </button>
              ))}
            </nav>

            <label className="commercial-search" aria-label="搜索">
              <Search size={16} className="text-[var(--ink-dim)]" />
              <input
                aria-label="搜索作品"
                placeholder="搜索书名、类型、开场事件"
                onKeyDown={event => {
                  if (event.key === 'Enter') navigate('/library')
                }}
              />
            </label>

            <div className="commercial-account-actions">
              <Button variant="ghost" size="sm" onClick={() => navigate('/story?world=beacon-beyond')}>
                <BookMarked size={15} />
                继续阅读
              </Button>
            </div>
          </header>

          <TopicFilterBar
            topics={categories}
            activeTopic={categories[0]}
            ariaLabel="热门题材索引"
            onSelect={category => navigate(libraryTopicPath(category))}
          />

          <div className="commercial-hero-grid">
            <aside className="commercial-side-panel">
              <div className="flex items-center gap-2">
                <Library className="text-[var(--worldline-cyan)]" size={18} />
              <h2 className="text-lg font-semibold text-[var(--ink-paper)]">热门题材索引</h2>
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
                最近更受欢迎的故事方向，帮你更快找到想看的宇宙。
              </p>
              <div className="mt-4 space-y-2">
                {trendBlocks.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className="commercial-category-row"
                    onClick={() => navigate(libraryTopicPath(item.label))}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[var(--ink-paper)]">{item.label}</span>
                      <span className="mt-1 block truncate text-xs text-[var(--ink-dim)]">{item.sample}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-xs font-semibold text-[var(--manuscript-gold)]">{item.tone}</span>
                      <span className="mt-1 block text-[11px] text-[var(--ink-dim)]">热度 {item.heat}</span>
                    </span>
                  </button>
                ))}
              </div>
              <button type="button" className="commercial-command-card mt-4" onClick={() => navigate('/library')}>
                <span>
                  <span className="block text-sm font-semibold text-[var(--ink-paper)]">按口味找书</span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--ink-muted)]">
                    高爽、强悬疑、慢热情感、仙侠权谋
                  </span>
                </span>
                <ArrowRight size={16} />
              </button>
            </aside>

            <main className="commercial-hero-main">
              <section className="commercial-feature-card">
                <div className="commercial-feature-copy">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="gold">主编强推</Badge>
                    <Badge variant="outline">{flagship.genre}</Badge>
                    <Badge variant="stasis">互动连载</Badge>
                  </div>
                  <h1 className="mt-4 max-w-3xl whitespace-nowrap text-3xl font-semibold leading-tight text-[var(--ink-paper)] md:text-4xl lg:text-[42px]">
                    世界在你脚下
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-muted)]">
                    《灯塔之外》正在连载。读到分歧点时，选择公开灯码、藏起名册，或追问那个不该出现的旧名，下一章会沿着你的决定继续。
                  </p>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <Button variant="gold" onClick={() => navigate('/story?world=beacon-beyond')}>
                      <BookOpen size={17} />
                      开始阅读
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/library')}>
                      <BookMarked size={17} />
                      进入书城
                    </Button>
                  </div>
                  <div className="commercial-hero-stats">
                    {heroStats.map(card => (
                      <div key={card.label} className="commercial-stat-card">
                        <p className="text-xl font-semibold text-[var(--ink-paper)]">{card.value}</p>
                        <p className="mt-1 text-[11px] font-semibold text-[var(--manuscript-gold)]">{card.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="commercial-cover-stage"
                  onClick={() => navigate('/story?world=beacon-beyond')}
                  aria-label="阅读灯塔之外"
                >
                  <span className="commercial-book-cover" style={coverStyle(flagship)} />
                  <span className="mt-4 block text-left">
                    <span className="block text-2xl font-semibold text-[var(--ink-paper)]">{flagship.title}</span>
                    <span className="mt-2 block text-sm leading-6 text-[var(--ink-muted)]">{flagship.tagline}</span>
                  </span>
                </button>
              </section>

              <section className="commercial-spotlight-grid">
                {editorSpotlights.map(pick => (
                  <button
                    key={pick.title}
                    type="button"
                    className="editor-pick-card"
                    onClick={() => navigate('/story?world=beacon-beyond')}
                  >
                    <Badge variant="outline">{pick.tag}</Badge>
                    <h3 className="mt-3 text-lg font-semibold text-[var(--ink-paper)]">{pick.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{pick.detail}</p>
                  </button>
                ))}
              </section>
            </main>

            <aside className="commercial-side-panel">
              <div className="flex items-center gap-2">
                <Trophy className="text-[var(--manuscript-gold)]" size={18} />
                <h2 className="text-lg font-semibold text-[var(--ink-paper)]">榜单</h2>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {['热读榜', '新书榜'].map(tab => (
                  <button
                    key={tab}
                    type="button"
                    className={activeRank === tab ? 'commercial-rank-tab-active' : 'commercial-rank-tab'}
                    onClick={() => setActiveRank(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <RankedWorldList
                worlds={rankedWorlds}
                onOpen={world => navigate(`/story?world=${world.id}`)}
              />
            </aside>
          </div>
        </div>
      </section>

      <section className="commercial-content-grid">
        <Panel className="commercial-section-panel">
          <div className="commercial-section-head">
            <div className="flex items-center gap-2">
              <Flame className="text-[var(--manuscript-gold)]" size={18} />
              <h2 className="text-lg font-semibold text-[var(--ink-paper)]">编辑推荐</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/library')}>
              全部作品
              <ArrowRight size={15} />
            </Button>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {channelShelves.map(channel => (
              <div key={channel.title} className="commercial-shelf">
                <h3 className="text-sm font-semibold text-[var(--manuscript-gold)]">{channel.title}</h3>
                <div className="mt-3 space-y-3">
                  {channel.worlds.map(world => (
                    <BookCard
                      key={`${channel.title}-${world.id}`}
                      title={world.title}
                      genre={world.genre}
                      hook={world.tagline}
                      cover={world.coverImage}
                      choices={world.choiceCount}
                      status={world.mode === 'flagship' ? 'flagship' : 'template'}
                      ctaLabel="阅读"
                      onOpen={() => navigate(`/story?world=${world.id}`)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel as="aside" className="commercial-section-panel">
          <div className="flex items-center gap-2">
            <UserRound className="text-[var(--worldline-cyan)]" size={18} />
            <h2 className="text-lg font-semibold text-[var(--ink-paper)]">作者更新</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
            读者可以边看边请求更新；作者会优先处理高热请求，再发布新章节或 IF 支线。
          </p>
          <div className="mt-4 grid gap-2">
            <Button className="justify-between" variant="outline" onClick={() => navigate('/story?world=beacon-beyond')}>
              <span className="flex items-center gap-2">
                <Feather size={16} />
                查看请求入口
              </span>
              <ArrowRight size={16} />
            </Button>
            <Button className="justify-between" variant="ghost" onClick={() => navigate('/library')}>
              <span className="flex items-center gap-2">
                <BookMarked size={16} />
                先逛书城
              </span>
              <ArrowRight size={16} />
            </Button>
          </div>
        </Panel>
      </section>

      <Panel className="commercial-section-panel">
        <div className="commercial-section-head">
          <div className="flex items-center gap-2">
            <Clock3 className="text-[var(--worldline-cyan)]" size={18} />
            <h2 className="text-lg font-semibold text-[var(--ink-paper)]">最近更新</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/library')}>
            更多更新
            <ArrowRight size={15} />
          </Button>
        </div>
        <div className="commercial-update-table">
          {latestRows.map(world => {
            const latest = firstChapter(world.id)
            return (
              <button
                key={world.id}
                type="button"
                className="commercial-update-row"
                onClick={() => navigate(`/story?world=${world.id}`)}
              >
                <span className="commercial-update-kind">{world.genre}</span>
                <span className="commercial-update-title">{world.title}</span>
                <span className="commercial-update-chapter">{latest?.title || '新章节'}</span>
                <span className="commercial-update-action">阅读</span>
              </button>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}
