export type ConversationTextEditResult =
  | { recognized: false }
  | { recognized: true; ok: false; notice: string }
  | { recognized: true; ok: true; content: string; notice: string }

function parseQuotedReplacement(message: string) {
  const match = message.trim().match(
    /^(?:把|将)\s*(?:“([^”]+)”|「([^」]+)」|『([^』]+)』|"([^"]+)")\s*(?:改成|替换为)\s*(?:“([^”]+)”|「([^」]+)」|『([^』]+)』|"([^"]+)")\s*[。.]?$/u,
  )
  if (!match) return null
  return {
    original: (match[1] || match[2] || match[3] || match[4] || '').trim(),
    replacement: (match[5] || match[6] || match[7] || match[8] || '').trim(),
  }
}

function occurrenceCount(content: string, fragment: string) {
  let count = 0
  let offset = 0
  while (offset <= content.length - fragment.length) {
    const index = content.indexOf(fragment, offset)
    if (index < 0) break
    count += 1
    offset = index + fragment.length
  }
  return count
}

export function runConversationTextEdit(input: {
  message: string
  content: string
}): ConversationTextEditResult {
  const command = parseQuotedReplacement(input.message)
  if (!command) return { recognized: false }
  if (!input.content.trim()) {
    return { recognized: true, ok: false, notice: '当前还没有可修改的正文草稿。' }
  }
  const matches = occurrenceCount(input.content, command.original)
  if (matches === 0) {
    return { recognized: true, ok: false, notice: '没有找到这段原文，请从定位证据中复制准确文字。' }
  }
  if (matches > 1) {
    return { recognized: true, ok: false, notice: '这段原文出现了多次，请补充更长的上下文后再修改。' }
  }
  return {
    recognized: true,
    ok: true,
    content: input.content.replace(command.original, command.replacement),
    notice: '已按你的原文定位完成一处修改；旧审阅将失效，需要重新检查。',
  }
}
