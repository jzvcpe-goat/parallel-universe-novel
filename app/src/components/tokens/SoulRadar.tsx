// ============================================================
// SoulRadar - 灵魂叙事偏好雷达图
// ============================================================
// 使用纯SVG实现，展示用户的多维阅读偏好

import { cn } from '@/lib/utils'
import type { SoulDimension } from '@/types'

interface SoulRadarProps {
  dimensions: SoulDimension[]
  size?: number
  className?: string
}

export function SoulRadar({ dimensions, size = 240, className }: SoulRadarProps) {
  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.35
  const levels = 4
  const angleStep = (Math.PI * 2) / dimensions.length

  // Grid polygons
  const gridPolys = Array.from({ length: levels }, (_, l) => {
    const r = (maxR * (l + 1)) / levels
    const points = dimensions.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
    })
    return points.join(' ')
  })

  // Data polygon
  const dataPoints = dimensions.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2
    const r = (d.value / d.max) * maxR
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
  })
  const dataPoly = dataPoints.join(' ')

  // Label positions
  const labels = dimensions.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2
    const r = maxR + 20
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      label: d.label,
    }
  })

  return (
    <div className={cn('relative', className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid */}
        {gridPolys.map((points, i) => (
          <polygon
            key={i}
            points={points}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={0.5}
          />
        ))}

        {/* Axis lines */}
        {dimensions.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2
          return (
            <line
              key={i}
              x1={cx} y1={cy}
              x2={cx + maxR * Math.cos(angle)}
              y2={cy + maxR * Math.sin(angle)}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={0.5}
            />
          )
        })}

        {/* Data area */}
        <polygon
          points={dataPoly}
          fill="rgba(96, 165, 250, 0.2)"
          stroke="#60a5fa"
          strokeWidth={1.5}
        />

        {/* Data dots */}
        {dimensions.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2
          const r = (d.value / d.max) * maxR
          return (
            <circle
              key={i}
              cx={cx + r * Math.cos(angle)}
              cy={cy + r * Math.sin(angle)}
              r={3}
              fill="#60a5fa"
              className="animate-node-pulse"
            />
          )
        })}

        {/* Labels */}
        {labels.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={l.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[9px] fill-slate-500 uppercase tracking-wider"
          >
            {l.label}
          </text>
        ))}
      </svg>
    </div>
  )
}
