import { useCallback, useState } from 'react'
import { storyApi } from '@/api'
import type { ReaderChapterView, ReaderWorld } from '@/types'

export function useStory() {
  const [worlds, setWorlds] = useState<ReaderWorld[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [chapters, setChapters] = useState<ReaderChapterView[]>([])
  const [paywallMessage, setPaywallMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadWorlds = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await storyApi.listWorlds()
      setWorlds(response.worlds)
    } catch (err) {
      setError(err instanceof Error ? err.message : '世界列表加载失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createSession = useCallback(async (worldId: string, accountId?: string | null) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await storyApi.createSession({ worldId, accountId })
      setSessionId(response.session_id)
      setChapters([])
      return response.session_id
    } catch (err) {
      setError(err instanceof Error ? err.message : '会话创建失败')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const continueSession = useCallback(async (nextSessionId: string, accountId?: string | null, choiceId?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await storyApi.continueSession({ sessionId: nextSessionId, accountId, choiceId })
      if (response.chapter_view) setChapters(prev => [...prev, response.chapter_view as ReaderChapterView])
      if (response.status === 'payment_required') {
        setPaywallMessage(response.continuity_contract?.message || '继续阅读需要解锁订阅。')
      }
      return response
    } catch (err) {
      setError(err instanceof Error ? err.message : '继续阅读失败')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    worlds,
    sessionId,
    chapters,
    paywallMessage,
    isLoading,
    error,
    loadWorlds,
    createSession,
    continueSession,
  }
}
