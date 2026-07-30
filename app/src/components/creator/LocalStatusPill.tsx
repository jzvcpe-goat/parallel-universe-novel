import { Badge } from '@/components/ui/badge'

export interface LocalStatusPillProps {
  isLocalSurface: boolean
}

export function LocalStatusPill({ isLocalSurface }: LocalStatusPillProps) {
  return (
    <Badge variant={isLocalSurface ? 'stasis' : 'outline'}>
      {isLocalSurface ? '本机写作' : '只读预览'}
    </Badge>
  )
}
