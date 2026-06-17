import { Card, CardContent } from '@/components/primitives/Card'
import { Button } from '@/components/primitives/Button'

interface FeatureUnavailableProps {
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function FeatureUnavailable({ title, message, actionLabel, onAction }: FeatureUnavailableProps) {
  return (
    <Card variant="generation">
      <CardContent className="pt-10 pb-10 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="text-sm text-slate-400 mt-2">{message}</p>
        </div>
        {actionLabel && onAction && (
          <Button variant="outline" onClick={onAction}>{actionLabel}</Button>
        )}
      </CardContent>
    </Card>
  )
}
