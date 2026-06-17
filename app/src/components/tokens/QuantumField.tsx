// ============================================================
// QuantumField - 量子粒子背景场
// ============================================================
// 纯CSS动画实现，突出平行宇宙的量子主题

import { cn } from '@/lib/utils'

interface QuantumFieldProps {
  density?: 'low' | 'medium' | 'high'
  className?: string
}

export function QuantumField({ density = 'medium', className }: QuantumFieldProps) {
  const counts = { low: 15, medium: 30, high: 50 }
  const count = counts[density]

  const stable = (seed: number, salt: number) => {
    const value = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453
    return value - Math.floor(value)
  }

  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${stable(i, 1) * 100}%`,
    top: `${stable(i, 2) * 100}%`,
    size: stable(i, 3) * 3 + 1,
    duration: stable(i, 4) * 10 + 8,
    delay: stable(i, 5) * 5,
    tx: `${(stable(i, 6) - 0.5) * 200}px`,
    ty: `${(stable(i, 7) - 0.5) * 200}px`,
    color: ['rgba(0, 212, 255, 0.4)', 'rgba(139, 92, 246, 0.3)', 'rgba(96, 165, 250, 0.35)'][Math.floor(stable(i, 8) * 3)],
  }))

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full animate-particle-drift"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            ['--tx' as string]: p.tx,
            ['--ty' as string]: p.ty,
          }}
        />
      ))}
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,212,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  )
}
