import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { readHashRoute } from '@/lib/hashRoute'

export function HashRouteBridge() {
  const navigate = useNavigate()

  useEffect(() => {
    const redirectHashRoute = () => {
      const route = readHashRoute()
      if (!route) return
      navigate(route, { replace: true })
    }

    redirectHashRoute()
    window.addEventListener('hashchange', redirectHashRoute)
    return () => window.removeEventListener('hashchange', redirectHashRoute)
  }, [navigate])

  return null
}
