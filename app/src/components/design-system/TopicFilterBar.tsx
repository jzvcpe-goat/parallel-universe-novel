interface TopicFilterBarProps {
  topics: string[]
  activeTopic?: string
  ariaLabel?: string
  onSelect: (topic: string) => void
}

export function TopicFilterBar({
  topics,
  activeTopic,
  ariaLabel = '热门题材索引',
  onSelect,
}: TopicFilterBarProps) {
  return (
    <nav className="novel-category-bar" aria-label={ariaLabel} data-testid="topic-filter-bar">
      {topics.map((topic, index) => (
        <button
          key={topic}
          type="button"
          className={activeTopic === topic || (!activeTopic && index === 0) ? 'novel-category-active' : ''}
          onClick={() => onSelect(topic)}
        >
          {topic}
        </button>
      ))}
    </nav>
  )
}
