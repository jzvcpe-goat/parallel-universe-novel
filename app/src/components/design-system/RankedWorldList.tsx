import type { WorldTemplate } from '@/features/parallel-universe/types'

interface RankedWorldListProps {
  worlds: WorldTemplate[]
  meta?: (world: WorldTemplate) => string
  onOpen: (world: WorldTemplate) => void
}

export function RankedWorldList({ worlds, meta, onOpen }: RankedWorldListProps) {
  return (
    <div className="mt-4 space-y-3" data-testid="ranked-world-list">
      {worlds.map((world, index) => (
        <button
          key={world.id}
          type="button"
          className="novel-rank-row"
          onClick={() => onOpen(world)}
        >
          <span className={index < 3 ? 'novel-rank-index-hot' : 'novel-rank-index'}>{index + 1}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[var(--ink-paper)]">{world.title}</span>
            <span className="mt-1 block truncate text-xs text-[var(--ink-muted)]">
              {meta ? meta(world) : `${world.genre} · ${world.choiceCount} 个选择`}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}
