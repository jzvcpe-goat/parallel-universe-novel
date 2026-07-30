export interface ConversationChapterSeed {
  title: string | null
  storySeed: string
}

const titleLinePattern = /^\s*(?:章节)?标题\s*[：:]\s*([^\n\r]+)\s*(?:\r?\n|$)/u

export function parseConversationChapterSeed(message: string): ConversationChapterSeed {
  const normalized = message.trim()
  const titleMatch = normalized.match(titleLinePattern)
  if (!titleMatch) {
    return { title: null, storySeed: normalized }
  }

  const storySeed = normalized
    .slice(titleMatch[0].length)
    .replace(/^\s*(?:故事|本章|意图)\s*[：:]\s*/u, '')
    .trim()

  return {
    title: titleMatch[1].trim().slice(0, 80) || null,
    storySeed,
  }
}
