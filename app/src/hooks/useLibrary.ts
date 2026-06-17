import { useCallback, useState } from 'react'
import { libraryApi } from '@/api'
import type { ReaderWorld } from '@/types'

export function useLibrary() {
  const [worlds, setWorlds] = useState<ReaderWorld[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadWorlds = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await libraryApi.getWorlds()
      setWorlds(response.worlds)
    } catch (err) {
      setError(err instanceof Error ? err.message : '世界列表加载失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { worlds, isLoading, error, loadWorlds }
}
